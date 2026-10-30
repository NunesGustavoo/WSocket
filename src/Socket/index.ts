import { Boom } from '@hapi/boom'
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import { DisconnectReason, UserFacingSocketConfig } from '../Types'
import { makeBusinessSocket } from './business'
import { makeConvenienceSocket } from './convenience'

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
	const businessSock = makeBusinessSocket({
		...DEFAULT_CONNECTION_CONFIG,
		...config
	})
	Object.defineProperty(businessSock, 'user', {
		get: () => businessSock.authState.creds.me,
		enumerable: true,
		configurable: true
	})

	const sock = makeConvenienceSocket(businessSock, {
		queue: config.queue,
		autoReconnect: config.autoReconnect
	})

	// Reconexão automática resiliente com backoff exponencial se habilitada
	if (config.autoReconnect?.enabled) {
		const initialDelay = config.autoReconnect.initialDelayMs || 2000
		const maxDelay = config.autoReconnect.maxDelayMs || 30000
		const maxRetries = config.autoReconnect.maxRetries || 0
		let retryCount = 0
		let currentDelay = initialDelay

		sock.ev.on('connection.update', update => {
			const { connection, lastDisconnect } = update

			if (connection === 'open') {
				retryCount = 0
				currentDelay = initialDelay
			}

			if (connection === 'close') {
				const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
				const isLoggedOut = statusCode === DisconnectReason.loggedOut

				// Não tenta reconectar se a sessão foi explicitamente finalizada pelo usuário no celular
				if (isLoggedOut) {
					return
				}

				if (maxRetries > 0 && retryCount >= maxRetries) {
					return
				}

				retryCount++
				setTimeout(() => {
					makeWASocket(config)
				}, currentDelay)

				currentDelay = Math.min(currentDelay * 2, maxDelay)
			}
		})
	}

	return sock
}

export default makeWASocket
