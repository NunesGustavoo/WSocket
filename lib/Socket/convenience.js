"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeConvenienceSocket = void 0;
const message_queue_1 = require("../Utils/message-queue");
const messages_1 = require("../Utils/messages");
const parse_message_1 = require("../Utils/parse-message");
const Protocols_1 = require("../WAUSync/Protocols");
const UsyncBotProfileProtocol_1 = require("../WAUSync/Protocols/UsyncBotProfileProtocol");
const USyncQuery_1 = require("../WAUSync/USyncQuery");
const USyncUser_1 = require("../WAUSync/USyncUser");
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
    /**
     * Envia botões nativos interativos (quick reply)
     */
    const sendButtons = async (jid, text, buttons, options = {}) => {
        const { title, subtitle, footer, quoted, delayMs, markReadBeforeReply, ...misc } = options;
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
                const typingDuration = messageQueue.calculateTypingDuration(text.length);
                await sock.sendPresenceUpdate('composing', jid);
                await new Promise(r => setTimeout(r, typingDuration));
                await sock.sendPresenceUpdate('paused', jid);
            }
            catch (_b) { }
        }
        return safeSendMessage(jid, {
            text,
            title,
            subtitle,
            footer,
            quickReplyButtons: buttons
        }, { quoted, ...misc });
    };
    /**
     * Envia uma mensagem de lista interativa (menu suspenso com seções e opções)
     */
    const sendList = async (jid, text, sections, options = {}) => {
        const { title, footer, buttonText = 'Ver opções', quoted, delayMs, markReadBeforeReply, ...misc } = options;
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
        }, { quoted, ...misc });
    };
    /**
     * Simula visualização/digitação por um tempo determinado e encerra
     */
    const simulateTyping = async (jid, durationMs = 2000) => {
        try {
            await sock.sendPresenceUpdate('composing', jid);
            await new Promise(r => setTimeout(r, durationMs));
        }
        finally {
            await sock.sendPresenceUpdate('paused', jid);
        }
    };
    /**
     * Simula gravação de áudio por um tempo determinado e encerra
     */
    const simulateRecording = async (jid, durationMs = 2500) => {
        try {
            await sock.sendPresenceUpdate('recording', jid);
            await new Promise(r => setTimeout(r, durationMs));
        }
        finally {
            await sock.sendPresenceUpdate('paused', jid);
        }
    };
    /**
     * Define modo stealth / fantasma (online ou offline) sem desconectar
     */
    const setStealthMode = async (stealth) => {
        return sock.sendPresenceUpdate(stealth ? 'unavailable' : 'available');
    };
    /**
     * Consulta informações em lote de vários contatos via USync em uma única requisição
     */
    const batchQueryContacts = async (jids, options = { status: true, devices: true, botProfile: true }) => {
        if (!sock.executeUSyncQuery)
            return [];
        const query = new USyncQuery_1.USyncQuery().withContext('interactive').withMode('query');
        if (options.status)
            query.protocols.push(new Protocols_1.USyncStatusProtocol());
        if (options.devices)
            query.protocols.push(new Protocols_1.USyncDeviceProtocol());
        if (options.disappearingMode)
            query.protocols.push(new Protocols_1.USyncDisappearingModeProtocol());
        if (options.botProfile)
            query.protocols.push(new UsyncBotProfileProtocol_1.USyncBotProfileProtocol());
        for (const jid of jids) {
            query.withUser(new USyncUser_1.USyncUser().withId(jid));
        }
        const result = await sock.executeUSyncQuery(query);
        if (!(result === null || result === void 0 ? void 0 : result.list))
            return [];
        return result.list.map((item) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: item.id,
                status: (_a = item.status) === null || _a === void 0 ? void 0 : _a.status,
                devices: (_b = item.devices) === null || _b === void 0 ? void 0 : _b.deviceList,
                disappearingMode: item.disappearing_mode,
                isBot: Boolean(((_d = (_c = item.bot) === null || _c === void 0 ? void 0 : _c.prompts) === null || _d === void 0 ? void 0 : _d.length) || ((_e = item.bot) === null || _e === void 0 ? void 0 : _e.model_name))
            });
        });
    };
    /**
     * Helper para buscar o histórico de mensagens sob demanda de uma conversa
     */
    const fetchChatHistory = async (count, oldestMsgKey, oldestMsgTimestamp) => {
        if (typeof sock.fetchMessageHistory === 'function') {
            return sock.fetchMessageHistory(count, oldestMsgKey, oldestMsgTimestamp);
        }
        throw new Error('fetchMessageHistory não suportado neste socket');
    };
    /**
     * Posta um Story / Status de texto com cor e fonte configuráveis
     */
    const postTextStatus = async (text, options = {}) => {
        var _a;
        return safeSendMessage(WABinary_1.STORIES_JID, {
            text
        }, {
            backgroundColor: options.backgroundColor || '#075e54',
            font: (_a = options.font) !== null && _a !== void 0 ? _a : 1,
            statusJidList: options.statusJidList
        });
    };
    /**
     * Posta um Story / Status de mídia (imagem ou vídeo)
     */
    const postMediaStatus = async (content, options = {}) => {
        return safeSendMessage(WABinary_1.STORIES_JID, content, { statusJidList: options.statusJidList });
    };
    /**
     * Fixa ou desafixa um chat no topo
     */
    const pinChat = async (jid, pin = true) => {
        if (typeof sock.chatModify === 'function') {
            return sock.chatModify({ pin }, jid);
        }
        throw new Error('chatModify não suportado neste socket');
    };
    /**
     * Silencia ou dessilencia um chat
     * @param durationMs Duração em ms (null ou 0 para dessilenciar, omitido para sempre)
     */
    const muteChat = async (jid, durationMs) => {
        if (typeof sock.chatModify === 'function') {
            const mute = durationMs === null || durationMs === 0 ? null : (durationMs ? Date.now() + durationMs : 8 * 3600 * 1000);
            return sock.chatModify({ mute }, jid);
        }
        throw new Error('chatModify não suportado neste socket');
    };
    /**
     * Arquiva ou desarquiva um chat
     */
    const archiveChat = async (jid, archive = true, lastMessages = []) => {
        if (typeof sock.chatModify === 'function') {
            return sock.chatModify({ archive, lastMessages }, jid);
        }
        throw new Error('chatModify não suportado neste socket');
    };
    /**
     * Favorita (estrela) ou desfavorita mensagens
     */
    const starMessage = async (jid, messages, star = true) => {
        if (typeof sock.star === 'function') {
            return sock.star(jid, messages, star);
        }
        throw new Error('star não suportado neste socket');
    };
    /**
     * Rejeita uma chamada recebida
     */
    const rejectCall = async (callId, callFrom) => {
        if (typeof sock.rejectCall === 'function') {
            return sock.rejectCall(callId, callFrom);
        }
        throw new Error('rejectCall não suportado neste socket');
    };
    /**
     * Event listener para chamadas recebidas (áudio ou vídeo)
     */
    const onCall = (callback) => {
        return sock.ev.on('call', (calls) => {
            for (const call of calls) {
                callback(call);
            }
        });
    };
    /**
     * Event listener para alterações de participantes em grupos (entrada, saída, promoção, rebaixamento)
     */
    const onGroupParticipantsUpdate = (callback) => {
        return sock.ev.on('group-participants.update', (data) => {
            callback(data);
        });
    };
    /**
     * Event listener para reações recebidas ou removidas
     */
    const onReaction = (callback) => {
        return sock.ev.on('messages.reaction', (reactions) => {
            for (const r of reactions) {
                callback({
                    key: r.key,
                    reaction: r.reaction,
                    senderJid: r.senderTimestampMs ? r.key.participant || r.key.remoteJid : ''
                });
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
    };
};
exports.makeConvenienceSocket = makeConvenienceSocket;
