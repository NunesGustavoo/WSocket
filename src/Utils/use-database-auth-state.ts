import { proto } from '../../WAProto/index.js'
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'
import { initAuthCreds } from './auth-utils'
import { BufferJSON } from './generics'

/**
 * Interface genérica para adaptadores de banco de dados (PostgreSQL, Redis, MySQL, SQLite, MongoDB, etc.)
 */
export interface AuthDbAdapter {
	/**
	 * Lê um valor associado a uma chave (ex: "creds", "session-123456@s.whatsapp.net:1")
	 * Pode retornar a string serializada em JSON ou o objeto já desserializado.
	 */
	get(key: string): Promise<string | object | null | undefined>

	/**
	 * Grava um valor serializado associado a uma chave
	 */
	set(key: string, value: string): Promise<void>

	/**
	 * Remove um registro associado a uma chave
	 */
	delete(key: string): Promise<void>

	/**
	 * (Opcional) Lê múltiplos valores de uma vez para alta performance
	 */
	getMany?(keys: string[]): Promise<Record<string, string | object | null | undefined>>

	/**
	 * (Opcional) Grava ou remove múltiplos valores de uma vez em lote
	 */
	setMany?(entries: { key: string; value: string | null }[]): Promise<void>
}

export interface DatabaseAuthStateOptions {
	/**
	 * Prefixo para isolar chaves no banco quando rodar múltiplas instâncias/sessões
	 * @default ''
	 */
	prefix?: string
	/**
	 * Nome da chave das credenciais
	 * @default 'creds'
	 */
	credsKey?: string
}

/**
 * Cria um AuthenticationState agnóstico a banco de dados.
 * Suporta Redis, PostgreSQL, MySQL, SQLite, MongoDB ou qualquer DB que implemente `AuthDbAdapter`.
 */
export const useDatabaseAuthState = async (
	adapter: AuthDbAdapter,
	options: DatabaseAuthStateOptions = {}
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
	const prefix = options.prefix ? `${options.prefix}:` : ''
	const credsKey = `${prefix}${options.credsKey || 'creds'}`

	const serialize = (data: unknown): string => JSON.stringify(data, BufferJSON.replacer)
	const deserialize = (data: unknown) => {
		if (!data) return null
		if (typeof data === 'string') {
			try {
				return JSON.parse(data, BufferJSON.reviver)
			} catch {
				return null
			}
		}
		// Se o adapter já retornar objeto parseado
		return JSON.parse(JSON.stringify(data), BufferJSON.reviver)
	}

	const rawCreds = await adapter.get(credsKey)
	const creds: AuthenticationCreds = deserialize(rawCreds) || initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
					const fullKeys = ids.map(id => ({ id, key: `${prefix}${type}-${id}` }))

					if (adapter.getMany) {
						const keyMap = fullKeys.map(k => k.key)
						const results = await adapter.getMany(keyMap)
						for (const { id, key } of fullKeys) {
							let value = deserialize(results[key])
							if (type === 'app-state-sync-key' && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(value)
							}
							data[id] = value
						}
					} else {
						await Promise.all(
							fullKeys.map(async ({ id, key }) => {
								let value = deserialize(await adapter.get(key))
								if (type === 'app-state-sync-key' && value) {
									value = proto.Message.AppStateSyncKeyData.fromObject(value)
								}
								data[id] = value
							})
						)
					}

					return data
				},
				set: async data => {
					const entries: { key: string; value: string | null }[] = []
					for (const category in data) {
						for (const id in data[category]) {
							const value = data[category][id]
							const key = `${prefix}${category}-${id}`
							entries.push({ key, value: value ? serialize(value) : null })
						}
					}

					if (adapter.setMany) {
						await adapter.setMany(entries)
					} else {
						await Promise.all(
							entries.map(async ({ key, value }) => {
								if (value) {
									await adapter.set(key, value)
								} else {
									await adapter.delete(key)
								}
							})
						)
					}
				}
			}
		},
		saveCreds: async () => {
			await adapter.set(credsKey, serialize(creds))
		}
	}
}
