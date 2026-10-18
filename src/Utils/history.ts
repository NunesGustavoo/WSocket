import { AxiosRequestConfig } from 'axios'
import { promisify } from 'util'
import { inflate } from 'zlib'
import { proto } from '../../WAProto'
import { Chat, Contact, WAMessageStubType } from '../Types'
import { isJidUser } from '../WABinary'
import { toNumber } from './generics'
import { normalizeMessageContent } from './messages'
import { downloadContentFromMessage } from './messages-media'
import { PROTO_WIRE_TYPES, scanProtoFields } from './proto-scan'

const inflatePromise = promisify(inflate)

// números conferidos contra HistorySync/Conversation em WAProto/WAProto.proto
const HISTORY_SYNC_FIELDS = {
	SYNC_TYPE: 1,
	CONVERSATIONS: 2,
	PROGRESS: 6,
	PUSHNAMES: 7,
	NCT_SALT: 19
} as const

const CONVERSATION_FIELDS = {
	MESSAGES: 2
} as const

export interface ProcessedHistorySync {
	chats: Chat[]
	contacts: Contact[]
	messages: proto.IWebMessageInfo[]
	syncType: proto.HistorySync.HistorySyncType
	progress?: number | null
	nctSalt?: Uint8Array | null
	conversations: Chat[]
}

export const downloadHistoryBuffer = async (
	msg: proto.Message.IHistorySyncNotification,
	options: AxiosRequestConfig<{}>
): Promise<Buffer> => {
	let buffer: Buffer
	if (msg.initialHistBootstrapInlinePayload?.length) {
		buffer = Buffer.from(msg.initialHistBootstrapInlinePayload)
	} else {
		const stream = await downloadContentFromMessage(msg, 'md-msg-hist', { options })
		const bufferArray: Buffer[] = []
		for await (const chunk of stream) {
			bufferArray.push(chunk)
		}

		buffer = Buffer.concat(bufferArray)
	}

	return inflatePromise(buffer)
}

export const downloadHistory = async (msg: proto.Message.IHistorySyncNotification, options: AxiosRequestConfig<{}>) => {
	const buffer = await downloadHistoryBuffer(msg, options)
	const syncData = proto.HistorySync.decode(buffer)
	return syncData
}

export const processHistorySyncBuffer = (
	buffer: Buffer,
	onMessage?: (message: proto.IWebMessageInfo) => void
): ProcessedHistorySync => {
	const messages: proto.IWebMessageInfo[] = []
	const contacts: Contact[] = []
	const chats: Chat[] = []
	const conversations: Chat[] = []
	let syncType = proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP as proto.HistorySync.HistorySyncType
	let progress: number | undefined
	let nctSalt: Uint8Array | undefined

	// syncType decide o que vira chat/contato, e o protobuf não garante que venha antes dos demais campos
	scanProtoFields(buffer, 0, buffer.length, field => {
		if (field.fieldNumber === HISTORY_SYNC_FIELDS.SYNC_TYPE && field.wireType === PROTO_WIRE_TYPES.VARINT) {
			syncType = field.varintValue
		}
	})

	const HST = proto.HistorySync.HistorySyncType
	const withConversations =
		syncType === HST.INITIAL_BOOTSTRAP || syncType === HST.RECENT || syncType === HST.FULL || syncType === HST.ON_DEMAND
	const withPushnames = syncType === HST.PUSH_NAME

	scanProtoFields(buffer, 0, buffer.length, field => {
		if (field.fieldNumber === HISTORY_SYNC_FIELDS.PROGRESS && field.wireType === PROTO_WIRE_TYPES.VARINT) {
			progress = field.varintValue
		} else if (field.fieldNumber === HISTORY_SYNC_FIELDS.NCT_SALT && field.wireType === PROTO_WIRE_TYPES.LEN) {
			nctSalt = buffer.subarray(field.valueStart, field.valueEnd)
		} else if (
			field.fieldNumber === HISTORY_SYNC_FIELDS.PUSHNAMES &&
			field.wireType === PROTO_WIRE_TYPES.LEN &&
			withPushnames
		) {
			try {
				const pushname = proto.Pushname.decode(buffer.subarray(field.valueStart, field.valueEnd))
				if (pushname.id && pushname.pushname) {
					contacts.push({ id: pushname.id, notify: pushname.pushname })
				}
			} catch (err) {
				// ignore malformed pushname
			}
		} else if (field.fieldNumber === HISTORY_SYNC_FIELDS.CONVERSATIONS && field.wireType === PROTO_WIRE_TYPES.LEN) {
			const headerParts: Uint8Array[] = []
			let latestMessage: proto.IWebMessageInfo | undefined
			let lastRecvTimestamp: number | undefined

			scanProtoFields(buffer, field.valueStart, field.valueEnd, convField => {
				if (convField.fieldNumber === CONVERSATION_FIELDS.MESSAGES && convField.wireType === PROTO_WIRE_TYPES.LEN) {
					if (!withConversations) {
						return
					}

					try {
						const historyMsg = proto.HistorySyncMsg.decode(buffer.subarray(convField.valueStart, convField.valueEnd))
						const msg = historyMsg.message
						if (msg) {
							if (onMessage) {
								onMessage(msg)
							} else {
								messages.push(msg)
							}

							if (!latestMessage) {
								latestMessage = msg
							}

							if (!msg.key.fromMe && !lastRecvTimestamp) {
								lastRecvTimestamp = toNumber(msg.messageTimestamp)
							}

							if (
								(msg.messageStubType === WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP ||
									msg.messageStubType === WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) &&
								msg.messageStubParameters?.[0]
							) {
								contacts.push({
									id: msg.key.participant || msg.key.remoteJid!,
									verifiedName: msg.messageStubParameters[0]
								})
							}
						}
					} catch (err) {
						// ignore individual corrupted message
					}
				} else {
					headerParts.push(buffer.subarray(convField.headerStart, convField.valueEnd))
				}
			})

			try {
				const chat = proto.Conversation.decode(Buffer.concat(headerParts)) as Chat
				if (chat.id) {
					// tcToken vem de qualquer syncType; chat/contato/mensagem só dos que o processHistoryMessage aceitava
					conversations.push(chat)

					if (withConversations) {
						contacts.push({
							id: chat.id,
							name: chat.name || undefined,
							lid: chat.lidJid || undefined,
							jid: isJidUser(chat.id) ? chat.id : undefined
						})

						chat.messages = latestMessage ? [{ message: latestMessage }] : undefined

						if (lastRecvTimestamp && !chat.lastMessageRecvTimestamp) {
							chat.lastMessageRecvTimestamp = lastRecvTimestamp
						}

						chats.push(chat)
					}
				}
			} catch (err) {
				// ignore failed conversation metadata
			}
		}
	})

	return {
		chats,
		contacts,
		messages,
		syncType,
		progress,
		nctSalt,
		conversations
	}
}

export const processHistoryMessage = (item: proto.IHistorySync) => {
	const messages: proto.IWebMessageInfo[] = []
	const contacts: Contact[] = []
	const chats: Chat[] = []

	switch (item.syncType) {
		case proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP:
		case proto.HistorySync.HistorySyncType.RECENT:
		case proto.HistorySync.HistorySyncType.FULL:
		case proto.HistorySync.HistorySyncType.ON_DEMAND:
			for (const chat of item.conversations! as Chat[]) {
				contacts.push({
					id: chat.id,
					name: chat.name || undefined,
					lid: chat.lidJid || undefined,
					jid: isJidUser(chat.id) ? chat.id : undefined
				})

				const msgs = chat.messages || []
				delete chat.messages

				for (const item of msgs) {
					const message = item.message!
					messages.push(message)

					if (!chat.messages?.length) {
						// keep only the most recent message in the chat array
						chat.messages = [{ message }]
					}

					if (!message.key.fromMe && !chat.lastMessageRecvTimestamp) {
						chat.lastMessageRecvTimestamp = toNumber(message.messageTimestamp)
					}

					if (
						(message.messageStubType === WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP ||
							message.messageStubType === WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) &&
						message.messageStubParameters?.[0]
					) {
						contacts.push({
							id: message.key.participant || message.key.remoteJid!,
							verifiedName: message.messageStubParameters?.[0]
						})
					}
				}

				chats.push({ ...chat })
			}

			break
		case proto.HistorySync.HistorySyncType.PUSH_NAME:
			for (const c of item.pushnames!) {
				contacts.push({ id: c.id!, notify: c.pushname! })
			}

			break
	}

	return {
		chats,
		contacts,
		messages,
		syncType: item.syncType,
		progress: item.progress
	}
}

export const downloadAndProcessHistorySyncNotification = async (
	msg: proto.Message.IHistorySyncNotification,
	options: AxiosRequestConfig<{}>
) => {
	const buffer = await downloadHistoryBuffer(msg, options)
	return processHistorySyncBuffer(buffer)
}

export const getHistoryMsg = (message: proto.IMessage) => {
	const normalizedContent = !!message ? normalizeMessageContent(message) : undefined
	const anyHistoryMsg = normalizedContent?.protocolMessage?.historySyncNotification

	return anyHistoryMsg
}
