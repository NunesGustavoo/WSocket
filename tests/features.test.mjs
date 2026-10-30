import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseMessage, MessageQueue, useDatabaseAuthState } = require('../lib/index.js')

test('parseMessage: decodifica texto simples de conversation', () => {
	const raw = {
		key: { id: 'M1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
		message: { conversation: 'Olá mundo' },
		messageTimestamp: 1700000000
	}

	const parsed = parseMessage(raw)
	assert.equal(parsed.id, 'M1')
	assert.equal(parsed.chatId, '5511999999999@s.whatsapp.net')
	assert.equal(parsed.sender, '5511999999999@s.whatsapp.net')
	assert.equal(parsed.text, 'Olá mundo')
	assert.equal(parsed.fromMe, false)
	assert.equal(parsed.isGroup, false)
})

test('parseMessage: identifica remetente e contexto em mensagens de grupo', () => {
	const raw = {
		key: {
			id: 'M2',
			remoteJid: '123456789-987654@g.us',
			participant: '5511888888888@s.whatsapp.net',
			fromMe: false
		},
		message: {
			extendedTextMessage: {
				text: 'Mensagem de grupo com citação',
				contextInfo: {
					stanzaId: 'ORIGINAL_MSG_ID',
					remoteJid: '123456789-987654@g.us',
					participant: '5511777777777@s.whatsapp.net',
					quotedMessage: {
						conversation: 'Texto citado anterior'
					}
				}
			}
		}
	}

	const parsed = parseMessage(raw)
	assert.equal(parsed.isGroup, true)
	assert.equal(parsed.sender, '5511888888888@s.whatsapp.net')
	assert.equal(parsed.text, 'Mensagem de grupo com citação')
	assert.equal(parsed.quoted?.key.id, 'ORIGINAL_MSG_ID')
	assert.equal(parsed.quoted?.text, 'Texto citado anterior')
	assert.equal(parsed.quoted?.sender, '5511777777777@s.whatsapp.net')
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
