import { proto } from '../../WAProto/index.js'
import {
	AnyMessageContent,
	MiscMessageGenerationOptions,
	WAMediaUpload,
	WAMessage,
	WAMessageKey
} from '../Types'
import {
	AutoReconnectConfig,
	QueueConfig,
	SendMediaOptions,
	SendTextOptions,
	SendVoiceOptions
} from '../Types/Helpers'
import { MessageQueue } from '../Utils/message-queue'
import { downloadMediaMessage } from '../Utils/messages'
import { ParsedMessage, parseMessage } from '../Utils/parse-message'
import { S_WHATSAPP_NET } from '../WABinary'

export type MessageEvents = {
	'message': (msg: ParsedMessage) => void
	'message:text': (data: { msg: ParsedMessage; text: string; reply: (text: string) => Promise<proto.WebMessageInfo | undefined> }) => void
	'message:audio': (data: { msg: ParsedMessage; isVoiceNote: boolean; duration?: number }) => void
	'message:image': (data: { msg: ParsedMessage; caption?: string }) => void
	'message:video': (data: { msg: ParsedMessage; caption?: string; duration?: number }) => void
	'message:document': (data: { msg: ParsedMessage; fileName?: string; mimetype?: string }) => void
	'message:interactive': (data: { msg: ParsedMessage; selectedId: string }) => void
}

export const makeConvenienceSocket = <T extends {
	sendMessage: (jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions) => Promise<proto.WebMessageInfo | undefined>
	sendPresenceUpdate: (type: 'composing' | 'recording' | 'paused' | 'available' | 'unavailable', toJid?: string) => Promise<void>
	readMessages: (keys: WAMessageKey[]) => Promise<void>
	onWhatsApp: (...jids: string[]) => Promise<{ exists: unknown; jid: string; lid?: unknown }[] | undefined>
	ev: any
}>(sock: T, optionsConfig?: { queue?: QueueConfig; autoReconnect?: AutoReconnectConfig }) => {
	const messageQueue = new MessageQueue(optionsConfig?.queue)

	const safeSendMessage = async (
		jid: string,
		content: AnyMessageContent,
		options: MiscMessageGenerationOptions = {}
	) => {
		return messageQueue.enqueue(async () => {
			return sock.sendMessage(jid, content, options)
		})
	}

	const sendText = async (jid: string, text: string, options: SendTextOptions = {}) => {
		const { delayMs, linkPreview, quoted, markReadBeforeReply, ...misc } = options

		// Anti-Ban 1: Marca a mensagem citada como lida com delay de leitura humana
		const shouldMarkRead = markReadBeforeReply ?? (messageQueue.isEnabled && messageQueue.autoMarkRead)
		if (quoted?.key && shouldMarkRead) {
			try {
				await sock.readMessages([quoted.key])
				// Intervalo de leitura humana (400ms a 900ms)
				const readDelay = 400 + Math.floor(Math.random() * 500)
				await new Promise(r => setTimeout(r, readDelay))
			} catch {}
		}

		// Anti-Ban 2: Digitação dinâmica com base no comprimento do texto
		if (delayMs) {
			await new Promise(r => setTimeout(r, delayMs))
		} else if (messageQueue.isEnabled && messageQueue.autoTyping) {
			try {
				const typingDuration = messageQueue.calculateTypingDuration(text.length)
				await sock.sendPresenceUpdate('composing', jid)
				await new Promise(r => setTimeout(r, typingDuration))
				await sock.sendPresenceUpdate('paused', jid)
			} catch {}
		}

		return safeSendMessage(
			jid,
			{
				text,
				linkPreview: linkPreview === false ? null : undefined
			},
			{ quoted, ...misc }
		)
	}

	const sendImage = async (jid: string, image: WAMediaUpload, options: SendMediaOptions = {}) => {
		const { caption, quoted, mimetype, delayMs, markReadBeforeReply, ...misc } = options

		const shouldMarkRead = markReadBeforeReply ?? (messageQueue.isEnabled && messageQueue.autoMarkRead)
		if (quoted?.key && shouldMarkRead) {
			try {
				await sock.readMessages([quoted.key])
				await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)))
			} catch {}
		}

		if (delayMs) await new Promise(r => setTimeout(r, delayMs))

		return safeSendMessage(
			jid,
			{
				image,
				caption,
				mimetype
			},
			{ quoted, ...misc }
		)
	}

	const sendVideo = async (jid: string, video: WAMediaUpload, options: SendMediaOptions = {}) => {
		const { caption, quoted, mimetype, delayMs, markReadBeforeReply, ...misc } = options

		const shouldMarkRead = markReadBeforeReply ?? (messageQueue.isEnabled && messageQueue.autoMarkRead)
		if (quoted?.key && shouldMarkRead) {
			try {
				await sock.readMessages([quoted.key])
				await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)))
			} catch {}
		}

		if (delayMs) await new Promise(r => setTimeout(r, delayMs))

		return safeSendMessage(
			jid,
			{
				video,
				caption,
				mimetype
			},
			{ quoted, ...misc }
		)
	}

	const sendVoice = async (jid: string, audio: WAMediaUpload, options: SendVoiceOptions = {}) => {
		const { quoted, delayMs, ptt = true, markReadBeforeReply, ...misc } = options

		const shouldMarkRead = markReadBeforeReply ?? (messageQueue.isEnabled && messageQueue.autoMarkRead)
		if (quoted?.key && shouldMarkRead) {
			try {
				await sock.readMessages([quoted.key])
				await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)))
			} catch {}
		}

		if (delayMs) {
			await new Promise(r => setTimeout(r, delayMs))
		} else if (messageQueue.isEnabled && messageQueue.autoTyping) {
			try {
				// Simulação de gravação de áudio proporcional
				const recordingDelay = 1200 + Math.floor(Math.random() * 800)
				await sock.sendPresenceUpdate('recording', jid)
				await new Promise(r => setTimeout(r, recordingDelay))
				await sock.sendPresenceUpdate('paused', jid)
			} catch {}
		}

		return safeSendMessage(
			jid,
			{
				audio,
				ptt,
				mimetype: 'audio/ogg; codecs=opus'
			},
			{ quoted, ...misc }
		)
	}

	const sendDocument = async (jid: string, document: WAMediaUpload, options: SendMediaOptions = {}) => {
		const { caption, fileName, mimetype, quoted, delayMs, markReadBeforeReply, ...misc } = options

		const shouldMarkRead = markReadBeforeReply ?? (messageQueue.isEnabled && messageQueue.autoMarkRead)
		if (quoted?.key && shouldMarkRead) {
			try {
				await sock.readMessages([quoted.key])
				await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)))
			} catch {}
		}

		if (delayMs) await new Promise(r => setTimeout(r, delayMs))

		return safeSendMessage(
			jid,
			{
				document,
				caption,
				fileName,
				mimetype: mimetype || 'application/octet-stream'
			},
			{ quoted, ...misc }
		)
	}

	const react = async (key: WAMessageKey, emoji: string) => {
		if (!key.remoteJid) return
		return safeSendMessage(key.remoteJid, {
			react: {
				text: emoji,
				key
			}
		})
	}

	const markAsRead = async (keys: WAMessageKey | WAMessageKey[]) => {
		const keyList = Array.isArray(keys) ? keys : [keys]
		return sock.readMessages(keyList)
	}

	const downloadMedia = async (msg: WAMessage | ParsedMessage): Promise<Buffer> => {
		const raw = 'raw' in msg ? msg.raw : msg
		return (await downloadMediaMessage(raw, 'buffer', {})) as Buffer
	}

	const resolveJid = async (phoneOrJid: string): Promise<string | undefined> => {
		if (!phoneOrJid) return undefined
		let cleaned = phoneOrJid.replace(/[^\d@a-z._-]/gi, '')

		if (cleaned.includes('@g.us') || cleaned.includes('@newsletter') || cleaned.includes('@lid')) {
			return cleaned
		}

		if (!cleaned.includes('@')) {
			cleaned = `${cleaned}${S_WHATSAPP_NET}`
		}

		const userPart = cleaned.split('@')[0]
		if (userPart.startsWith('55') && (userPart.length === 12 || userPart.length === 13)) {
			const results = await sock.onWhatsApp(userPart)
			const match = results?.find(r => Boolean(r.exists))
			if (match?.jid) {
				return match.jid
			}
		}

		return cleaned
	}

	const onMessage = (callback: MessageEvents['message']) => {
		return sock.ev.on('messages.upsert', ({ messages, type }: { messages: any[]; type: string }) => {
			if (type !== 'notify') return
			for (const rawMsg of messages) {
				if (rawMsg.key?.fromMe) continue
				const parsed = parseMessage(rawMsg)
				if (parsed.chatId) {
					callback(parsed)
				}
			}
		})
	}

	const onText = (callback: MessageEvents['message:text']) => {
		return onMessage(msg => {
			if (msg.text) {
				const reply = (replyText: string) => sendText(msg.chatId, replyText, { quoted: msg.raw })
				callback({ msg, text: msg.text, reply })
			}
		})
	}

	const onAudio = (callback: MessageEvents['message:audio']) => {
		return onMessage(msg => {
			if (msg.mediaType === 'audio' || msg.mediaType === 'voice') {
				callback({ msg, isVoiceNote: msg.isVoiceNote, duration: msg.duration })
			}
		})
	}

	const onImage = (callback: MessageEvents['message:image']) => {
		return onMessage(msg => {
			if (msg.mediaType === 'image') {
				callback({ msg, caption: msg.text })
			}
		})
	}

	const onInteractive = (callback: MessageEvents['message:interactive']) => {
		return onMessage(msg => {
			if (msg.selectedButtonId) {
				callback({ msg, selectedId: msg.selectedButtonId })
			}
		})
	}

	return {
		...sock,
		queue: messageQueue,
		configureQueue: (config: Partial<QueueConfig>) => messageQueue.updateConfig(config),
		sendText,
		sendImage,
		sendVideo,
		sendVoice,
		sendDocument,
		react,
		markAsRead,
		downloadMedia,
		resolveJid,
		onMessage,
		onText,
		onAudio,
		onImage,
		onInteractive
	}
}
