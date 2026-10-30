import { QueueConfig } from '../Types/Helpers'

export class MessageQueue {
	private queue: Array<() => Promise<void>> = []
	private isProcessing = false
	private config: Required<QueueConfig>

	constructor(config?: QueueConfig) {
		this.config = {
			enabled: config?.enabled ?? false,
			minIntervalMs: config?.minIntervalMs ?? 1000,
			jitterMs: config?.jitterMs ?? 1500,
			autoSimulateTyping: config?.autoSimulateTyping ?? true,
			dynamicTyping: config?.dynamicTyping ?? true,
			typingDurationMs: config?.typingDurationMs ?? 1200,
			autoMarkReadOnReply: config?.autoMarkReadOnReply ?? true
		}
	}

	get isEnabled() {
		return this.config.enabled
	}

	get autoTyping() {
		return this.config.autoSimulateTyping
	}

	get dynamicTyping() {
		return this.config.dynamicTyping
	}

	get typingMs() {
		return this.config.typingDurationMs
	}

	get autoMarkRead() {
		return this.config.autoMarkReadOnReply
	}

	/**
	 * Calcula o tempo de digitação humano proporcional ao tamanho do texto
	 * (entre 800ms e 4500ms com jitter aleatório)
	 */
	calculateTypingDuration(textLength = 0): number {
		if (!this.config.dynamicTyping) {
			return this.config.typingDurationMs
		}

		const basePerChar = 25 // 25ms por caractere
		const calculated = 800 + (textLength * basePerChar)
		const jitter = Math.floor(Math.random() * 400) // 0-400ms de variação
		return Math.min(4500, Math.max(800, calculated + jitter))
	}

	updateConfig(newConfig: Partial<QueueConfig>) {
		this.config = { ...this.config, ...newConfig }
	}

	enqueue<T>(task: () => Promise<T>): Promise<T> {
		if (!this.config.enabled) {
			return task()
		}

		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await task()
					resolve(result)
				} catch (err) {
					reject(err)
				}
			})

			if (!this.isProcessing) {
				this.processNext()
			}
		})
	}

	private async processNext() {
		if (this.queue.length === 0) {
			this.isProcessing = false
			return
		}

		this.isProcessing = true
		const currentTask = this.queue.shift()

		if (currentTask) {
			try {
				await currentTask()
			} catch {}

			const jitter = Math.floor(Math.random() * (this.config.jitterMs + 1))
			const delay = this.config.minIntervalMs + jitter

			await new Promise(r => setTimeout(r, delay))
		}

		this.processNext()
	}

	clear() {
		this.queue = []
		this.isProcessing = false
	}
}
