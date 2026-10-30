import { proto } from '../../WAProto/index.js'
import { WAMessage, WAMessageContent } from '../Types'
import { isJidGroup, isJidNewsletter, isJidStatusBroadcast } from '../WABinary'
import { extractMessageContent, getContentType } from './messages'

export type ParsedMediaType = 'image' | 'video' | 'audio' | 'voice' | 'sticker' | 'document' | 'contact' | 'location'

export interface ParsedQuotedMessage {
	key: proto.IMessageKey
	text?: string
	sender?: string
	message?: WAMessageContent
}

export interface ParsedMessage {
	/** Chave identificadora única da mensagem */
	key: proto.IMessageKey
	/** ID da mensagem */
	id: string
	/** JID da conversa (remetente ou grupo) */
	chatId: string
	/** JID do autor real (quando for em grupo) ou do remetente */
	sender: string
	/** Nome de exibição (pushName) do usuário */
	pushName?: string
	/** Indica se a mensagem foi enviada por mim mesmo */
	fromMe: boolean
	/** Indica se é uma mensagem de grupo (@g.us) */
	isGroup: boolean
	/** Indica se é status / stories (@broadcast) */
	isStatus: boolean
	/** Indica se é post de canal (@newsletter) */
	isNewsletter: boolean
	/** Timestamp Unix em segundos */
	timestamp: number
	/** Tipo do nó de mensagem (ex: conversation, extendedTextMessage, imageMessage, etc.) */
	type?: string
	/** Texto principal extraído (conversation, extendedTextMessage, caption de mídia, botão clicado, etc.) */
	text?: string
	/** Tipo de mídia caso contenha */
	mediaType?: ParsedMediaType
	/** Mimetype do arquivo se for mídia */
	mimetype?: string
	/** Duração em segundos (para áudio/vídeo) */
	duration?: number
	/** Se for áudio, indica se é mensagem de voz / PTT */
	isVoiceNote: boolean
	/** Dados da mensagem citada (quote / reply), se houver */
	quoted?: ParsedQuotedMessage
	/** Se for resposta interativa a botão/lista, o ID selecionado */
	selectedButtonId?: string
	/** Objeto bruto original WAMessage */
	raw: WAMessage
}

/**
 * Normaliza e extrai de forma simples e direta o conteúdo de qualquer mensagem do WhatsApp.
 * Elimina o trabalho manual de navegar em decenas de campos de protobuf.
 */
export const parseMessage = (msg: WAMessage): ParsedMessage => {
	const key = msg.key
	const id = key.id || ''
	const chatId = key.remoteJid || ''
	const fromMe = Boolean(key.fromMe)
	const isGroup = Boolean(isJidGroup(chatId))
	const isStatus = isJidStatusBroadcast(chatId)
	const isNewsletter = Boolean(isJidNewsletter(chatId))
	const sender = (isGroup ? key.participant : chatId) || ''
	const timestamp = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)

	const rawContent = msg.message
	const content = extractMessageContent(rawContent)
	const type = content ? getContentType(content) : undefined

	let text: string | undefined
	let mediaType: ParsedMediaType | undefined
	let mimetype: string | undefined
	let duration: number | undefined
	let isVoiceNote = false
	let selectedButtonId: string | undefined
	let quoted: ParsedQuotedMessage | undefined

	if (content) {
		// 1. Texto puro ou com formatação
		if (content.conversation) {
			text = content.conversation
		} else if (content.extendedTextMessage?.text) {
			text = content.extendedTextMessage.text
		}

		// 2. Imagem
		if (content.imageMessage) {
			mediaType = 'image'
			mimetype = content.imageMessage.mimetype || undefined
			text = content.imageMessage.caption || text
		}

		// 3. Vídeo
		if (content.videoMessage) {
			mediaType = 'video'
			mimetype = content.videoMessage.mimetype || undefined
			duration = content.videoMessage.seconds || undefined
			text = content.videoMessage.caption || text
		}

		// 4. Áudio / Mensagem de Voz
		if (content.audioMessage) {
			mediaType = 'audio'
			mimetype = content.audioMessage.mimetype || undefined
			duration = content.audioMessage.seconds || undefined
			isVoiceNote = Boolean(content.audioMessage.ptt)
			if (isVoiceNote) {
				mediaType = 'voice'
			}
		}

		// 5. Figurinha (Sticker)
		if (content.stickerMessage) {
			mediaType = 'sticker'
			mimetype = content.stickerMessage.mimetype || undefined
		}

		// 6. Documento
		if (content.documentMessage) {
			mediaType = 'document'
			mimetype = content.documentMessage.mimetype || undefined
			text = content.documentMessage.caption || content.documentMessage.fileName || text
		}

		// 7. Localização
		if (content.locationMessage || content.liveLocationMessage) {
			mediaType = 'location'
			text = content.locationMessage?.name || content.locationMessage?.address || text
		}

		// 8. Contato
		if (content.contactMessage || content.contactsArrayMessage) {
			mediaType = 'contact'
			text = content.contactMessage?.displayName || text
		}

		// 9. Respostas interativas (botões, listas, native flow)
		if (content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
			try {
				const params = JSON.parse(content.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
				selectedButtonId = params.id || params.name
				text = selectedButtonId || text
			} catch {}
		} else if (content.buttonsResponseMessage) {
			selectedButtonId = content.buttonsResponseMessage.selectedButtonId || undefined
			text = content.buttonsResponseMessage.selectedDisplayText || selectedButtonId || text
		} else if (content.templateButtonReplyMessage) {
			selectedButtonId = content.templateButtonReplyMessage.selectedId || undefined
			text = content.templateButtonReplyMessage.selectedDisplayText || selectedButtonId || text
		} else if (content.listResponseMessage) {
			selectedButtonId = content.listResponseMessage.singleSelectReply?.selectedRowId || undefined
			text = content.listResponseMessage.title || selectedButtonId || text
		}

		// 10. Extração de mensagem citada (Quoted / ContextInfo)
		const contextInfo =
			content.extendedTextMessage?.contextInfo ||
			content.imageMessage?.contextInfo ||
			content.videoMessage?.contextInfo ||
			content.audioMessage?.contextInfo ||
			content.documentMessage?.contextInfo ||
			content.stickerMessage?.contextInfo ||
			content.interactiveResponseMessage?.contextInfo

		if (contextInfo?.quotedMessage && contextInfo.stanzaId) {
			const quotedContent = extractMessageContent(contextInfo.quotedMessage)
			const quotedText =
				quotedContent?.conversation ||
				quotedContent?.extendedTextMessage?.text ||
				quotedContent?.imageMessage?.caption ||
				quotedContent?.videoMessage?.caption ||
				quotedContent?.documentMessage?.caption

			quoted = {
				key: {
					remoteJid: contextInfo.remoteJid || chatId,
					fromMe: false,
					id: contextInfo.stanzaId,
					participant: contextInfo.participant
				},
				text: quotedText || undefined,
				sender: contextInfo.participant || contextInfo.remoteJid || undefined,
				message: contextInfo.quotedMessage
			}
		}
	}

	return {
		key,
		id,
		chatId,
		sender,
		pushName: msg.pushName || undefined,
		fromMe,
		isGroup,
		isStatus,
		isNewsletter,
		timestamp,
		type,
		text,
		mediaType,
		mimetype,
		duration,
		isVoiceNote,
		selectedButtonId,
		quoted,
		raw: msg
	}
}
