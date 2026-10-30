"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = void 0;
const WABinary_1 = require("../WABinary");
const messages_1 = require("./messages");
/**
 * Normaliza e extrai de forma simples e direta o conteúdo de qualquer mensagem do WhatsApp.
 * Elimina o trabalho manual de navegar em decenas de campos de protobuf.
 */
const parseMessage = (msg) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const key = msg.key;
    const id = key.id || '';
    const chatId = key.remoteJid || '';
    const fromMe = Boolean(key.fromMe);
    const isGroup = Boolean((0, WABinary_1.isJidGroup)(chatId));
    const isStatus = (0, WABinary_1.isJidStatusBroadcast)(chatId);
    const isNewsletter = Boolean((0, WABinary_1.isJidNewsletter)(chatId));
    const sender = (isGroup ? key.participant : chatId) || '';
    const timestamp = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);
    const rawContent = msg.message;
    const content = (0, messages_1.extractMessageContent)(rawContent);
    const type = content ? (0, messages_1.getContentType)(content) : undefined;
    let text;
    let mediaType;
    let mimetype;
    let duration;
    let isVoiceNote = false;
    let selectedButtonId;
    let quoted;
    if (content) {
        // 1. Texto puro ou com formatação
        if (content.conversation) {
            text = content.conversation;
        }
        else if ((_a = content.extendedTextMessage) === null || _a === void 0 ? void 0 : _a.text) {
            text = content.extendedTextMessage.text;
        }
        // 2. Imagem
        if (content.imageMessage) {
            mediaType = 'image';
            mimetype = content.imageMessage.mimetype || undefined;
            text = content.imageMessage.caption || text;
        }
        // 3. Vídeo
        if (content.videoMessage) {
            mediaType = 'video';
            mimetype = content.videoMessage.mimetype || undefined;
            duration = content.videoMessage.seconds || undefined;
            text = content.videoMessage.caption || text;
        }
        // 4. Áudio / Mensagem de Voz
        if (content.audioMessage) {
            mediaType = 'audio';
            mimetype = content.audioMessage.mimetype || undefined;
            duration = content.audioMessage.seconds || undefined;
            isVoiceNote = Boolean(content.audioMessage.ptt);
            if (isVoiceNote) {
                mediaType = 'voice';
            }
        }
        // 5. Figurinha (Sticker)
        if (content.stickerMessage) {
            mediaType = 'sticker';
            mimetype = content.stickerMessage.mimetype || undefined;
        }
        // 6. Documento
        if (content.documentMessage) {
            mediaType = 'document';
            mimetype = content.documentMessage.mimetype || undefined;
            text = content.documentMessage.caption || content.documentMessage.fileName || text;
        }
        // 7. Localização
        if (content.locationMessage || content.liveLocationMessage) {
            mediaType = 'location';
            text = ((_b = content.locationMessage) === null || _b === void 0 ? void 0 : _b.name) || ((_c = content.locationMessage) === null || _c === void 0 ? void 0 : _c.address) || text;
        }
        // 8. Contato
        if (content.contactMessage || content.contactsArrayMessage) {
            mediaType = 'contact';
            text = ((_d = content.contactMessage) === null || _d === void 0 ? void 0 : _d.displayName) || text;
        }
        // 9. Respostas interativas (botões, listas, native flow)
        if ((_f = (_e = content.interactiveResponseMessage) === null || _e === void 0 ? void 0 : _e.nativeFlowResponseMessage) === null || _f === void 0 ? void 0 : _f.paramsJson) {
            try {
                const params = JSON.parse(content.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                selectedButtonId = params.id || params.name;
                text = selectedButtonId || text;
            }
            catch (_u) { }
        }
        else if (content.buttonsResponseMessage) {
            selectedButtonId = content.buttonsResponseMessage.selectedButtonId || undefined;
            text = content.buttonsResponseMessage.selectedDisplayText || selectedButtonId || text;
        }
        else if (content.templateButtonReplyMessage) {
            selectedButtonId = content.templateButtonReplyMessage.selectedId || undefined;
            text = content.templateButtonReplyMessage.selectedDisplayText || selectedButtonId || text;
        }
        else if (content.listResponseMessage) {
            selectedButtonId = ((_g = content.listResponseMessage.singleSelectReply) === null || _g === void 0 ? void 0 : _g.selectedRowId) || undefined;
            text = content.listResponseMessage.title || selectedButtonId || text;
        }
        // 10. Extração de mensagem citada (Quoted / ContextInfo)
        const contextInfo = ((_h = content.extendedTextMessage) === null || _h === void 0 ? void 0 : _h.contextInfo) ||
            ((_j = content.imageMessage) === null || _j === void 0 ? void 0 : _j.contextInfo) ||
            ((_k = content.videoMessage) === null || _k === void 0 ? void 0 : _k.contextInfo) ||
            ((_l = content.audioMessage) === null || _l === void 0 ? void 0 : _l.contextInfo) ||
            ((_m = content.documentMessage) === null || _m === void 0 ? void 0 : _m.contextInfo) ||
            ((_o = content.stickerMessage) === null || _o === void 0 ? void 0 : _o.contextInfo) ||
            ((_p = content.interactiveResponseMessage) === null || _p === void 0 ? void 0 : _p.contextInfo);
        if ((contextInfo === null || contextInfo === void 0 ? void 0 : contextInfo.quotedMessage) && contextInfo.stanzaId) {
            const quotedContent = (0, messages_1.extractMessageContent)(contextInfo.quotedMessage);
            const quotedText = (quotedContent === null || quotedContent === void 0 ? void 0 : quotedContent.conversation) ||
                ((_q = quotedContent === null || quotedContent === void 0 ? void 0 : quotedContent.extendedTextMessage) === null || _q === void 0 ? void 0 : _q.text) ||
                ((_r = quotedContent === null || quotedContent === void 0 ? void 0 : quotedContent.imageMessage) === null || _r === void 0 ? void 0 : _r.caption) ||
                ((_s = quotedContent === null || quotedContent === void 0 ? void 0 : quotedContent.videoMessage) === null || _s === void 0 ? void 0 : _s.caption) ||
                ((_t = quotedContent === null || quotedContent === void 0 ? void 0 : quotedContent.documentMessage) === null || _t === void 0 ? void 0 : _t.caption);
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
            };
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
    };
};
exports.parseMessage = parseMessage;
