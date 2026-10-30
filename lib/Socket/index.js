"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Defaults_1 = require("../Defaults");
const Types_1 = require("../Types");
const business_1 = require("./business");
const convenience_1 = require("./convenience");
// export the last socket layer
const makeWASocket = (config) => {
    var _a;
    const businessSock = (0, business_1.makeBusinessSocket)({
        ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
        ...config
    });
    Object.defineProperty(businessSock, 'user', {
        get: () => businessSock.authState.creds.me,
        enumerable: true,
        configurable: true
    });
    const sock = (0, convenience_1.makeConvenienceSocket)(businessSock, {
        queue: config.queue,
        autoReconnect: config.autoReconnect
    });
    // Reconexão automática resiliente com backoff exponencial se habilitada
    if ((_a = config.autoReconnect) === null || _a === void 0 ? void 0 : _a.enabled) {
        const initialDelay = config.autoReconnect.initialDelayMs || 2000;
        const maxDelay = config.autoReconnect.maxDelayMs || 30000;
        const maxRetries = config.autoReconnect.maxRetries || 0;
        let retryCount = 0;
        let currentDelay = initialDelay;
        sock.ev.on('connection.update', update => {
            var _a, _b;
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                retryCount = 0;
                currentDelay = initialDelay;
            }
            if (connection === 'close') {
                const statusCode = (_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode;
                const isLoggedOut = statusCode === Types_1.DisconnectReason.loggedOut;
                // Não tenta reconectar se a sessão foi explicitamente finalizada pelo usuário no celular
                if (isLoggedOut) {
                    return;
                }
                if (maxRetries > 0 && retryCount >= maxRetries) {
                    return;
                }
                retryCount++;
                setTimeout(() => {
                    makeWASocket(config);
                }, currentDelay);
                currentDelay = Math.min(currentDelay * 2, maxDelay);
            }
        });
    }
    return sock;
};
exports.default = makeWASocket;
