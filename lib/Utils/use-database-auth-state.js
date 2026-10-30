"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDatabaseAuthState = void 0;
const index_js_1 = require("../../WAProto/index.js");
const auth_utils_1 = require("./auth-utils");
const generics_1 = require("./generics");
/**
 * Cria um AuthenticationState agnóstico a banco de dados.
 * Suporta Redis, PostgreSQL, MySQL, SQLite, MongoDB ou qualquer DB que implemente `AuthDbAdapter`.
 */
const useDatabaseAuthState = async (adapter, options = {}) => {
    const prefix = options.prefix ? `${options.prefix}:` : '';
    const credsKey = `${prefix}${options.credsKey || 'creds'}`;
    const serialize = (data) => JSON.stringify(data, generics_1.BufferJSON.replacer);
    const deserialize = (data) => {
        if (!data)
            return null;
        if (typeof data === 'string') {
            try {
                return JSON.parse(data, generics_1.BufferJSON.reviver);
            }
            catch (_a) {
                return null;
            }
        }
        // Se o adapter já retornar objeto parseado
        return JSON.parse(JSON.stringify(data), generics_1.BufferJSON.reviver);
    };
    const rawCreds = await adapter.get(credsKey);
    const creds = deserialize(rawCreds) || (0, auth_utils_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    const fullKeys = ids.map(id => ({ id, key: `${prefix}${type}-${id}` }));
                    if (adapter.getMany) {
                        const keyMap = fullKeys.map(k => k.key);
                        const results = await adapter.getMany(keyMap);
                        for (const { id, key } of fullKeys) {
                            let value = deserialize(results[key]);
                            if (type === 'app-state-sync-key' && value) {
                                value = index_js_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    else {
                        await Promise.all(fullKeys.map(async ({ id, key }) => {
                            let value = deserialize(await adapter.get(key));
                            if (type === 'app-state-sync-key' && value) {
                                value = index_js_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }));
                    }
                    return data;
                },
                set: async (data) => {
                    const entries = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${prefix}${category}-${id}`;
                            entries.push({ key, value: value ? serialize(value) : null });
                        }
                    }
                    if (adapter.setMany) {
                        await adapter.setMany(entries);
                    }
                    else {
                        await Promise.all(entries.map(async ({ key, value }) => {
                            if (value) {
                                await adapter.set(key, value);
                            }
                            else {
                                await adapter.delete(key);
                            }
                        }));
                    }
                }
            }
        },
        saveCreds: async () => {
            await adapter.set(credsKey, serialize(creds));
        }
    };
};
exports.useDatabaseAuthState = useDatabaseAuthState;
