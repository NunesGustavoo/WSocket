import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMessage, MessageQueue, useDatabaseAuthState, makeWASocket } from '../lib/index.js'
import { makeConvenienceSocket } from '../lib/Socket/convenience.js'

test('parseMessage: decodifica texto simples de conversation', () => {
	const raw = {
		key: {
			id: 'M1',
			remoteJid: '5511999999999@s.whatsapp.net',
			fromMe: false
		},
		messageTimestamp: 1700000000,
		pushName: 'Gustavo',
		message: {
			conversation: 'Olá mundo!'
		}
	}

	const parsed = parseMessage(raw)
	assert.equal(parsed.id, 'M1')
	assert.equal(parsed.chatId, '5511999999999@s.whatsapp.net')
	assert.equal(parsed.sender, '5511999999999@s.whatsapp.net')
	assert.equal(parsed.text, 'Olá mundo!')
	assert.equal(parsed.type, 'conversation')
	assert.equal(parsed.isGroup, false)
})

test('parseMessage: identifica remetente e contexto em mensagens de grupo', () => {
	const raw = {
		key: {
			id: 'M2',
			remoteJid: '123456789@g.us',
			participant: '5511888888888@s.whatsapp.net',
			fromMe: false
		},
		messageTimestamp: 1700000001,
		pushName: 'Participante',
		message: {
			extendedTextMessage: {
				text: 'Mensagem no grupo'
			}
		}
	}

	const parsed = parseMessage(raw)
	assert.equal(parsed.id, 'M2')
	assert.equal(parsed.chatId, '123456789@g.us')
	assert.equal(parsed.sender, '5511888888888@s.whatsapp.net')
	assert.equal(parsed.text, 'Mensagem no grupo')
	assert.equal(parsed.isGroup, true)
})

test('parseMessage: identifica mídias e notas de voz (PTT)', () => {
	const rawAudio = {
		key: { id: 'M3', remoteJid: '5511999999999@s.whatsapp.net' },
		message: {
			audioMessage: {
				mimetype: 'audio/ogg; codecs=opus',
				seconds: 15,
				ptt: true
			}
		}
	}

	const parsedAudio = parseMessage(rawAudio)
	assert.equal(parsedAudio.mediaType, 'voice')
	assert.equal(parsedAudio.isVoiceNote, true)
	assert.equal(parsedAudio.duration, 15)

	const rawImage = {
		key: { id: 'M4', remoteJid: '5511999999999@s.whatsapp.net' },
		message: {
			imageMessage: {
				caption: 'Foto do recibo',
				mimetype: 'image/jpeg'
			}
		}
	}

	const parsedImage = parseMessage(rawImage)
	assert.equal(parsedImage.mediaType, 'image')
	assert.equal(parsedImage.text, 'Foto do recibo')
})

test('MessageQueue: executa tarefas em ordem e respeita fila', async () => {
	const queue = new MessageQueue({ enabled: true, minIntervalMs: 20, jitterMs: 10 })
	const results = []

	await Promise.all([
		queue.enqueue(async () => results.push(1)),
		queue.enqueue(async () => results.push(2)),
		queue.enqueue(async () => results.push(3))
	])

	assert.deepEqual(results, [1, 2, 3])
})

test('useDatabaseAuthState: grava e restaura credenciais e chaves em memória', async () => {
	const storage = new Map()
	const adapter = {
		get: async key => storage.get(key) || null,
		set: async (key, value) => { storage.set(key, value) },
		delete: async key => { storage.delete(key) }
	}

	const { state, saveCreds } = await useDatabaseAuthState(adapter, { prefix: 'test' })
	assert.ok(state.creds)

	state.creds.me = { id: '5511999999999@s.whatsapp.net', name: 'Tester' }
	await saveCreds()

	// Simula nova inicialização lendo do banco
	const { state: restoredState } = await useDatabaseAuthState(adapter, { prefix: 'test' })
	assert.equal(restoredState.creds.me?.id, '5511999999999@s.whatsapp.net')
	assert.equal(restoredState.creds.me?.name, 'Tester')
})

test('makeConvenienceSocket: expõe todos os métodos avançados e interativos', async () => {
	const sentMessages = []
	const presenceUpdates = []
	const chatMods = []

	const mockSocket = {
		sendMessage: async (jid, content, options) => {
			sentMessages.push({ jid, content, options })
			return { key: { id: 'msg_123', remoteJid: jid } }
		},
		sendPresenceUpdate: async (type, toJid) => {
			presenceUpdates.push({ type, toJid })
		},
		readMessages: async () => {},
		onWhatsApp: async () => [{ exists: true, jid: '5511999999999@s.whatsapp.net' }],
		chatModify: async (mod, jid) => {
			chatMods.push({ mod, jid })
		},
		rejectCall: async (callId, callFrom) => ({ callId, callFrom }),
		ev: { on: () => {} }
	}

	const convSock = makeConvenienceSocket(mockSocket, { queue: { enabled: false } })

	// Validação de existência de métodos
	assert.equal(typeof convSock.sendButtons, 'function')
	assert.equal(typeof convSock.sendList, 'function')
	assert.equal(typeof convSock.simulateTyping, 'function')
	assert.equal(typeof convSock.simulateRecording, 'function')
	assert.equal(typeof convSock.postTextStatus, 'function')
	assert.equal(typeof convSock.postMediaStatus, 'function')
	assert.equal(typeof convSock.pinChat, 'function')
	assert.equal(typeof convSock.muteChat, 'function')
	assert.equal(typeof convSock.archiveChat, 'function')
	assert.equal(typeof convSock.rejectCall, 'function')

	// Teste de sendButtons
	await convSock.sendButtons('5511999999999', 'Escolha uma opção:', [
		{ id: 'b1', displayText: 'Opção 1' }
	], { title: 'Título' })
	assert.equal(sentMessages.length, 1)
	assert.equal(sentMessages[0].content.title, 'Título')
	assert.deepEqual(sentMessages[0].content.quickReplyButtons, [{ id: 'b1', displayText: 'Opção 1' }])

	// Teste de postTextStatus
	await convSock.postTextStatus('Meu Status', { backgroundColor: '#123456' })
	assert.equal(sentMessages.length, 2)
	assert.equal(sentMessages[1].jid, 'status@broadcast')
	assert.equal(sentMessages[1].content.text, 'Meu Status')

	// Teste de pinChat e muteChat
	await convSock.pinChat('5511999999999@s.whatsapp.net', true)
	await convSock.muteChat('5511999999999@s.whatsapp.net', 3600000)
	assert.equal(chatMods.length, 2)
	assert.deepEqual(chatMods[0].mod, { pin: true })
})
