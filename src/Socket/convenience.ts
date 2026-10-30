import { proto } from '../../WAProto/index.js'
import {
	WACallEvent,
	AnyMessageContent,
	MiscMessageGenerationOptions,
	WAMediaUpload,
	WAMessage,
	WAMessageKey
} from '../Types'
import {
	AutoReconnectConfig,
	BatchContactQueryOptions,
	BatchContactQueryResult,
	ListSectionItem,
	QuickReplyButtonItem,
	QueueConfig,
	SendButtonsOptions,
	SendListOptions,
	SendMediaOptions,
	SendTextOptions,
	SendVoiceOptions
} from '../Types/Helpers'
import { MessageQueue } from '../Utils/message-queue'
import { downloadMediaMessage } from '../Utils/messages'
import { ParsedMessage, parseMessage } from '../Utils/parse-message'
import { USyncContactProtocol, USyncDeviceProtocol, USyncDisappearingModeProtocol, USyncStatusProtocol } from '../WAUSync/Protocols'
import { USyncBotProfileProtocol } from '../WAUSync/Protocols/UsyncBotProfileProtocol'
import { USyncQuery } from '../WAUSync/USyncQuery'
import { USyncUser } from '../WAUSync/USyncUser'
import { S_WHATSAPP_NET, STORIES_JID } from '../WABinary'

export type MessageEvents = {
	'message': (msg: ParsedMessage) => void
	'message:text': (data: { msg: ParsedMessage; text: string; reply: (text: string) => Promise<proto.WebMessageInfo | undefined> }) => void
	'message:audio': (data: { msg: ParsedMessage; isVoiceNote: boolean; duration?: number }) => void
	'message:image': (data: { msg: ParsedMessage; caption?: string }) => void
	'message:video': (data: { msg: ParsedMessage; caption?: string; duration?: number }) => void
	'message:document': (data: { msg: ParsedMessage; fileName?: string; mimetype?: string }) => void
	'message:interactive': (data: { msg: ParsedMessage; selectedId: string }) => void
	'call': (call: WACallEvent) => void
	'reaction': (data: { key: WAMessageKey; reaction: string; senderJid: string }) => void
	'group:participant': (data: { id: string; author?: string; participants: string[]; action: 'add' | 'remove' | 'promote' | 'demote' }) => void
}

export const makeConvenienceSocket = <T extends Record<string, any>>(sock: T, optionsConfig?: { queue?: QueueConfig; autoReconnect?: AutoReconnectConfig }) => {
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

	
	/**
	 * Envia botões nativos interativos (quick reply)
	 */
	const sendButtons = async (
		jid: string,
		text: string,
		buttons: QuickReplyButtonItem[],
		options: SendButtonsOptions = {}
	) => {
		const { title, subtitle, footer, quoted, delayMs, markReadBeforeReply, ...misc } = options

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
				title,
				subtitle,
				footer,
				quickReplyButtons: buttons
			},
			{ quoted, ...misc }
		)
	}

	/**
	 * Envia uma mensagem de lista interativa (menu suspenso com seções e opções)
	 */
	const sendList = async (
		jid: string,
		text: string,
		sections: ListSectionItem[],
		options: SendListOptions = {}
	) => {
		const { title, footer, buttonText = 'Ver opções', quoted, delayMs, markReadBeforeReply, ...misc } = options

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
				text,
				title,
				footer,
				buttonText,
				sections: sections.map(s => ({
					title: s.title,
					rows: s.rows.map(r => ({
						rowId: r.id,
						title: r.title,
						description: r.description
					}))
				}))
			},
			{ quoted, ...misc }
		)
	}

	/**
	 * Simula visualização/digitação por um tempo determinado e encerra
	 */
	const simulateTyping = async (jid: string, durationMs = 2000) => {
		try {
			await sock.sendPresenceUpdate('composing', jid)
			await new Promise(r => setTimeout(r, durationMs))
		} finally {
			await sock.sendPresenceUpdate('paused', jid)
		}
	}

	/**
	 * Simula gravação de áudio por um tempo determinado e encerra
	 */
	const simulateRecording = async (jid: string, durationMs = 2500) => {
		try {
			await sock.sendPresenceUpdate('recording', jid)
			await new Promise(r => setTimeout(r, durationMs))
		} finally {
			await sock.sendPresenceUpdate('paused', jid)
		}
	}

	/**
	 * Define modo stealth / fantasma (online ou offline) sem desconectar
	 */
	const setStealthMode = async (stealth: boolean) => {
		return sock.sendPresenceUpdate(stealth ? 'unavailable' : 'available')
	}

	/**
	 * Consulta informações em lote de vários contatos via USync em uma única requisição
	 */
	const batchQueryContacts = async (
		jids: string[],
		options: BatchContactQueryOptions = { status: true, devices: true, botProfile: true }
	): Promise<BatchContactQueryResult[]> => {
		if (!sock.executeUSyncQuery) return []
		const query = new USyncQuery().withContext('interactive').withMode('query')

		if (options.status) query.protocols.push(new USyncStatusProtocol())
		if (options.devices) query.protocols.push(new USyncDeviceProtocol())
		if (options.disappearingMode) query.protocols.push(new USyncDisappearingModeProtocol())
		if (options.botProfile) query.protocols.push(new USyncBotProfileProtocol())

		for (const jid of jids) {
			query.withUser(new USyncUser().withId(jid))
		}

		const result = await sock.executeUSyncQuery(query)
		if (!result?.list) return []

		return result.list.map((item: any) => ({
			id: item.id,
			status: item.status?.status,
			devices: item.devices?.deviceList,
			disappearingMode: item.disappearing_mode,
			isBot: Boolean(item.bot?.prompts?.length || item.bot?.model_name)
		}))
	}

	/**
	 * Helper para buscar o histórico de mensagens sob demanda de uma conversa
	 */
	const fetchChatHistory = async (count: number, oldestMsgKey: WAMessageKey, oldestMsgTimestamp: number | Long) => {
		if (typeof sock.fetchMessageHistory === 'function') {
			return sock.fetchMessageHistory(count, oldestMsgKey, oldestMsgTimestamp)
		}
		throw new Error('fetchMessageHistory não suportado neste socket')
	}


	/**
	 * Posta um Story / Status de texto com cor e fonte configuráveis
	 */
	const postTextStatus = async (
		text: string,
		options: { backgroundColor?: string; font?: number; statusJidList?: string[] } = {}
	) => {
		return safeSendMessage(
			STORIES_JID,
			{
				text
			},
			{
				backgroundColor: options.backgroundColor || '#075e54',
				font: options.font ?? 1,
				statusJidList: options.statusJidList
			}
		)
	}

	/**
	 * Posta um Story / Status de mídia (imagem ou vídeo)
	 */
	const postMediaStatus = async (
		content: { image: WAMediaUpload; caption?: string } | { video: WAMediaUpload; caption?: string },
		options: { statusJidList?: string[] } = {}
	) => {
		return safeSendMessage(
			STORIES_JID,
			content,
			{ statusJidList: options.statusJidList }
		)
	}

	/**
	 * Fixa ou desafixa um chat no topo
	 */
	const pinChat = async (jid: string, pin = true) => {
		if (typeof sock.chatModify === 'function') {
			return sock.chatModify({ pin }, jid)
		}
		throw new Error('chatModify não suportado neste socket')
	}

	/**
	 * Silencia ou dessilencia um chat
	 * @param durationMs Duração em ms (null ou 0 para dessilenciar, omitido para sempre)
	 */
	const muteChat = async (jid: string, durationMs?: number | null) => {
		if (typeof sock.chatModify === 'function') {
			const mute = durationMs === null || durationMs === 0 ? null : (durationMs ? Date.now() + durationMs : 8 * 3600 * 1000)
			return sock.chatModify({ mute }, jid)
		}
		throw new Error('chatModify não suportado neste socket')
	}

	/**
	 * Arquiva ou desarquiva um chat
	 */
	const archiveChat = async (jid: string, archive = true, lastMessages: any[] = []) => {
		if (typeof sock.chatModify === 'function') {
			return sock.chatModify({ archive, lastMessages }, jid)
		}
		throw new Error('chatModify não suportado neste socket')
	}

	/**
	 * Favorita (estrela) ou desfavorita mensagens
	 */
	const starMessage = async (jid: string, messages: { id: string; fromMe?: boolean }[], star = true) => {
		if (typeof sock.star === 'function') {
			return sock.star(jid, messages, star)
		}
		throw new Error('star não suportado neste socket')
	}

	/**
	 * Rejeita uma chamada recebida
	 */
	const rejectCall = async (callId: string, callFrom: string) => {
		if (typeof sock.rejectCall === 'function') {
			return sock.rejectCall(callId, callFrom)
		}
		throw new Error('rejectCall não suportado neste socket')
	}

	/**
	 * Event listener para chamadas recebidas (áudio ou vídeo)
	 */
	const onCall = (callback: MessageEvents['call']) => {
		return sock.ev.on('call', (calls: WACallEvent[]) => {
			for (const call of calls) {
				callback(call)
			}
		})
	}

	/**
	 * Event listener para alterações de participantes em grupos (entrada, saída, promoção, rebaixamento)
	 */
	const onGroupParticipantsUpdate = (callback: MessageEvents['group:participant']) => {
		return sock.ev.on('group-participants.update', (data: any) => {
			callback(data)
		})
	}

	/**
	 * Event listener para reações recebidas ou removidas
	 */
	const onReaction = (callback: MessageEvents['reaction']) => {
		return sock.ev.on('messages.reaction', (reactions: any[]) => {
			for (const r of reactions) {
				callback({
					key: r.key,
					reaction: r.reaction,
					senderJid: r.senderTimestampMs ? r.key.participant || r.key.remoteJid : ''
				})
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
		sendButtons,
		sendList,
		simulateTyping,
		simulateRecording,
		setStealthMode,
		batchQueryContacts,
		fetchChatHistory,
		onMessage,
		onText,
		onAudio,
		onImage,
		onInteractive,
		postTextStatus,
		postMediaStatus,
		pinChat,
		muteChat,
		archiveChat,
		starMessage,
		rejectCall,
		onCall,
		onGroupParticipantsUpdate,
		onReaction,
	}
}
