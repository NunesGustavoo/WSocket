"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeConvenienceSocket = void 0;
const message_queue_1 = require("../Utils/message-queue");
const messages_1 = require("../Utils/messages");
const parse_message_1 = require("../Utils/parse-message");
const WABinary_1 = require("../WABinary");
const makeConvenienceSocket = (sock, optionsConfig) => {
    const messageQueue = new message_queue_1.MessageQueue(optionsConfig === null || optionsConfig === void 0 ? void 0 : optionsConfig.queue);
    const safeSendMessage = async (jid, content, options = {}) => {
        return messageQueue.enqueue(async () => {
            return sock.sendMessage(jid, content, options);
        });
    };
    const sendText = async (jid, text, options = {}) => {
        const { delayMs, linkPreview, quoted, markReadBeforeReply, ...misc } = options;
        // Anti-Ban 1: Marca a mensagem citada como lida com delay de leitura humana
        const shouldMarkRead = markReadBeforeReply !== null && markReadBeforeReply !== void 0 ? markReadBeforeReply : (messageQueue.isEnabled && messageQueue.autoMarkRead);
        if ((quoted === null || quoted === void 0 ? void 0 : quoted.key) && shouldMarkRead) {
            try {
                await sock.readMessages([quoted.key]);
                // Intervalo de leitura humana (400ms a 900ms)
                const readDelay = 400 + Math.floor(Math.random() * 500);
                await new Promise(r => setTimeout(r, readDelay));
            }
            catch (_a) { }
        }
        // Anti-Ban 2: Digitação dinâmica com base no comprimento do texto
        if (delayMs) {
            await new Promise(r => setTimeout(r, delayMs));
        }
        else if (messageQueue.isEnabled && messageQueue.autoTyping) {
            try {
                const typingDuration = messageQueue.calculateTypingDuration(text.length);
                await sock.sendPresenceUpdate('composing', jid);
                await new Promise(r => setTimeout(r, typingDuration));
                await sock.sendPresenceUpdate('paused', jid);
            }
            catch (_b) { }
        }
        return safeSendMessage(jid, {
            text,
            linkPreview: linkPreview === false ? null : undefined
        }, { quoted, ...misc });
    };
    const sendImage = async (jid, image, options = {}) => {
        const { caption, quoted, mimetype, delayMs, markReadBeforeReply, ...misc } = options;
        const shouldMarkRead = markReadBeforeReply !== null && markReadBeforeReply !== void 0 ? markReadBeforeReply : (messageQueue.isEnabled && messageQueue.autoMarkRead);
        if ((quoted === null || quoted === void 0 ? void 0 : quoted.key) && shouldMarkRead) {
            try {
                await sock.readMessages([quoted.key]);
                await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)));
            }
            catch (_a) { }
        }
        if (delayMs)
            await new Promise(r => setTimeout(r, delayMs));
        return safeSendMessage(jid, {
            image,
            caption,
            mimetype
        }, { quoted, ...misc });
    };
    const sendVideo = async (jid, video, options = {}) => {
        const { caption, quoted, mimetype, delayMs, markReadBeforeReply, ...misc } = options;
        const shouldMarkRead = markReadBeforeReply !== null && markReadBeforeReply !== void 0 ? markReadBeforeReply : (messageQueue.isEnabled && messageQueue.autoMarkRead);
        if ((quoted === null || quoted === void 0 ? void 0 : quoted.key) && shouldMarkRead) {
            try {
                await sock.readMessages([quoted.key]);
                await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)));
            }
            catch (_a) { }
        }
        if (delayMs)
            await new Promise(r => setTimeout(r, delayMs));
        return safeSendMessage(jid, {
            video,
            caption,
            mimetype
        }, { quoted, ...misc });
    };
    const sendVoice = async (jid, audio, options = {}) => {
        const { quoted, delayMs, ptt = true, markReadBeforeReply, ...misc } = options;
        const shouldMarkRead = markReadBeforeReply !== null && markReadBeforeReply !== void 0 ? markReadBeforeReply : (messageQueue.isEnabled && messageQueue.autoMarkRead);
        if ((quoted === null || quoted === void 0 ? void 0 : quoted.key) && shouldMarkRead) {
            try {
                await sock.readMessages([quoted.key]);
                await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)));
            }
            catch (_a) { }
        }
        if (delayMs) {
            await new Promise(r => setTimeout(r, delayMs));
        }
        else if (messageQueue.isEnabled && messageQueue.autoTyping) {
            try {
                // Simulação de gravação de áudio proporcional
                const recordingDelay = 1200 + Math.floor(Math.random() * 800);
                await sock.sendPresenceUpdate('recording', jid);
                await new Promise(r => setTimeout(r, recordingDelay));
                await sock.sendPresenceUpdate('paused', jid);
            }
            catch (_b) { }
        }
        return safeSendMessage(jid, {
            audio,
            ptt,
            mimetype: 'audio/ogg; codecs=opus'
        }, { quoted, ...misc });
    };
    const sendDocument = async (jid, document, options = {}) => {
        const { caption, fileName, mimetype, quoted, delayMs, markReadBeforeReply, ...misc } = options;
        const shouldMarkRead = markReadBeforeReply !== null && markReadBeforeReply !== void 0 ? markReadBeforeReply : (messageQueue.isEnabled && messageQueue.autoMarkRead);
        if ((quoted === null || quoted === void 0 ? void 0 : quoted.key) && shouldMarkRead) {
            try {
                await sock.readMessages([quoted.key]);
                await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 400)));
            }
            catch (_a) { }
        }
        if (delayMs)
            await new Promise(r => setTimeout(r, delayMs));
        return safeSendMessage(jid, {
            document,
            caption,
            fileName,
            mimetype: mimetype || 'application/octet-stream'
        }, { quoted, ...misc });
    };
    const react = async (key, emoji) => {
        if (!key.remoteJid)
            return;
        return safeSendMessage(key.remoteJid, {
            react: {
                text: emoji,
                key
            }
        });
    };
    const markAsRead = async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        return sock.readMessages(keyList);
    };
    const downloadMedia = async (msg) => {
        const raw = 'raw' in msg ? msg.raw : msg;
        return (await (0, messages_1.downloadMediaMessage)(raw, 'buffer', {}));
    };
    const resolveJid = async (phoneOrJid) => {
        if (!phoneOrJid)
            return undefined;
        let cleaned = phoneOrJid.replace(/[^\d@a-z._-]/gi, '');
        if (cleaned.includes('@g.us') || cleaned.includes('@newsletter') || cleaned.includes('@lid')) {
            return cleaned;
        }
        if (!cleaned.includes('@')) {
            cleaned = `${cleaned}${WABinary_1.S_WHATSAPP_NET}`;
        }
        const userPart = cleaned.split('@')[0];
        if (userPart.startsWith('55') && (userPart.length === 12 || userPart.length === 13)) {
            const results = await sock.onWhatsApp(userPart);
            const match = results === null || results === void 0 ? void 0 : results.find(r => Boolean(r.exists));
            if (match === null || match === void 0 ? void 0 : match.jid) {
                return match.jid;
            }
        }
        return cleaned;
    };
    const onMessage = (callback) => {
        return sock.ev.on('messages.upsert', ({ messages, type }) => {
            var _a;
            if (type !== 'notify')
                return;
            for (const rawMsg of messages) {
                if ((_a = rawMsg.key) === null || _a === void 0 ? void 0 : _a.fromMe)
                    continue;
                const parsed = (0, parse_message_1.parseMessage)(rawMsg);
                if (parsed.chatId) {
                    callback(parsed);
                }
            }
        });
    };
    const onText = (callback) => {
        return onMessage(msg => {
            if (msg.text) {
                const reply = (replyText) => sendText(msg.chatId, replyText, { quoted: msg.raw });
                callback({ msg, text: msg.text, reply });
            }
        });
    };
    const onAudio = (callback) => {
        return onMessage(msg => {
            if (msg.mediaType === 'audio' || msg.mediaType === 'voice') {
                callback({ msg, isVoiceNote: msg.isVoiceNote, duration: msg.duration });
            }
        });
    };
    const onImage = (callback) => {
        return onMessage(msg => {
            if (msg.mediaType === 'image') {
                callback({ msg, caption: msg.text });
            }
        });
    };
    const onInteractive = (callback) => {
        return onMessage(msg => {
            if (msg.selectedButtonId) {
                callback({ msg, selectedId: msg.selectedButtonId });
            }
        });
    };
    return {
        ...sock,
        queue: messageQueue,
        configureQueue: (config) => messageQueue.updateConfig(config),
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
    };
};
exports.makeConvenienceSocket = makeConvenienceSocket;
