"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoryMsg = exports.downloadAndProcessHistorySyncNotification = exports.processHistoryMessage = exports.processHistorySyncBuffer = exports.downloadHistory = exports.downloadHistoryBuffer = void 0;
const util_1 = require("util");
const zlib_1 = require("zlib");
const WAProto_1 = require("../../WAProto");
const Types_1 = require("../Types");
const WABinary_1 = require("../WABinary");
const generics_1 = require("./generics");
const messages_1 = require("./messages");
const messages_media_1 = require("./messages-media");
const proto_scan_1 = require("./proto-scan");
const inflatePromise = (0, util_1.promisify)(zlib_1.inflate);
// números conferidos contra HistorySync/Conversation em WAProto/WAProto.proto
const HISTORY_SYNC_FIELDS = {
    SYNC_TYPE: 1,
    CONVERSATIONS: 2,
    PROGRESS: 6,
    PUSHNAMES: 7,
    NCT_SALT: 19
};
const CONVERSATION_FIELDS = {
    MESSAGES: 2
};
const downloadHistoryBuffer = async (msg, options) => {
    var _a;
    let buffer;
    if ((_a = msg.initialHistBootstrapInlinePayload) === null || _a === void 0 ? void 0 : _a.length) {
        buffer = Buffer.from(msg.initialHistBootstrapInlinePayload);
    }
    else {
        const stream = await (0, messages_media_1.downloadContentFromMessage)(msg, 'md-msg-hist', { options });
        const bufferArray = [];
        for await (const chunk of stream) {
            bufferArray.push(chunk);
        }
        buffer = Buffer.concat(bufferArray);
    }
    return inflatePromise(buffer);
};
exports.downloadHistoryBuffer = downloadHistoryBuffer;
const downloadHistory = async (msg, options) => {
    const buffer = await (0, exports.downloadHistoryBuffer)(msg, options);
    const syncData = WAProto_1.proto.HistorySync.decode(buffer);
    return syncData;
};
exports.downloadHistory = downloadHistory;
const processHistorySyncBuffer = (buffer, onMessage) => {
    const messages = [];
    const contacts = [];
    const chats = [];
    const conversations = [];
    let syncType = WAProto_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP;
    let progress;
    let nctSalt;
    // syncType decide o que vira chat/contato, e o protobuf não garante que venha antes dos demais campos
    (0, proto_scan_1.scanProtoFields)(buffer, 0, buffer.length, field => {
        if (field.fieldNumber === HISTORY_SYNC_FIELDS.SYNC_TYPE && field.wireType === proto_scan_1.PROTO_WIRE_TYPES.VARINT) {
            syncType = field.varintValue;
        }
    });
    const HST = WAProto_1.proto.HistorySync.HistorySyncType;
    const withConversations = syncType === HST.INITIAL_BOOTSTRAP || syncType === HST.RECENT || syncType === HST.FULL || syncType === HST.ON_DEMAND;
    const withPushnames = syncType === HST.PUSH_NAME;
    (0, proto_scan_1.scanProtoFields)(buffer, 0, buffer.length, field => {
        if (field.fieldNumber === HISTORY_SYNC_FIELDS.PROGRESS && field.wireType === proto_scan_1.PROTO_WIRE_TYPES.VARINT) {
            progress = field.varintValue;
        }
        else if (field.fieldNumber === HISTORY_SYNC_FIELDS.NCT_SALT && field.wireType === proto_scan_1.PROTO_WIRE_TYPES.LEN) {
            nctSalt = buffer.subarray(field.valueStart, field.valueEnd);
        }
        else if (field.fieldNumber === HISTORY_SYNC_FIELDS.PUSHNAMES &&
            field.wireType === proto_scan_1.PROTO_WIRE_TYPES.LEN &&
            withPushnames) {
            try {
                const pushname = WAProto_1.proto.Pushname.decode(buffer.subarray(field.valueStart, field.valueEnd));
                if (pushname.id && pushname.pushname) {
                    contacts.push({ id: pushname.id, notify: pushname.pushname });
                }
            }
            catch (err) {
                // ignore malformed pushname
            }
        }
        else if (field.fieldNumber === HISTORY_SYNC_FIELDS.CONVERSATIONS && field.wireType === proto_scan_1.PROTO_WIRE_TYPES.LEN) {
            const headerParts = [];
            let latestMessage;
            let lastRecvTimestamp;
            (0, proto_scan_1.scanProtoFields)(buffer, field.valueStart, field.valueEnd, convField => {
                var _a;
                if (convField.fieldNumber === CONVERSATION_FIELDS.MESSAGES && convField.wireType === proto_scan_1.PROTO_WIRE_TYPES.LEN) {
                    if (!withConversations) {
                        return;
                    }
                    try {
                        const historyMsg = WAProto_1.proto.HistorySyncMsg.decode(buffer.subarray(convField.valueStart, convField.valueEnd));
                        const msg = historyMsg.message;
                        if (msg) {
                            if (onMessage) {
                                onMessage(msg);
                            }
                            else {
                                messages.push(msg);
                            }
                            if (!latestMessage) {
                                latestMessage = msg;
                            }
                            if (!msg.key.fromMe && !lastRecvTimestamp) {
                                lastRecvTimestamp = (0, generics_1.toNumber)(msg.messageTimestamp);
                            }
                            if ((msg.messageStubType === Types_1.WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP ||
                                msg.messageStubType === Types_1.WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) &&
                                ((_a = msg.messageStubParameters) === null || _a === void 0 ? void 0 : _a[0])) {
                                contacts.push({
                                    id: msg.key.participant || msg.key.remoteJid,
                                    verifiedName: msg.messageStubParameters[0]
                                });
                            }
                        }
                    }
                    catch (err) {
                        // ignore individual corrupted message
                    }
                }
                else {
                    headerParts.push(buffer.subarray(convField.headerStart, convField.valueEnd));
                }
            });
            try {
                const chat = WAProto_1.proto.Conversation.decode(Buffer.concat(headerParts));
                if (chat.id) {
                    // tcToken vem de qualquer syncType; chat/contato/mensagem só dos que o processHistoryMessage aceitava
                    conversations.push(chat);
                    if (withConversations) {
                        contacts.push({
                            id: chat.id,
                            name: chat.name || undefined,
                            lid: chat.lidJid || undefined,
                            jid: (0, WABinary_1.isJidUser)(chat.id) ? chat.id : undefined
                        });
                        chat.messages = latestMessage ? [{ message: latestMessage }] : undefined;
                        if (lastRecvTimestamp && !chat.lastMessageRecvTimestamp) {
                            chat.lastMessageRecvTimestamp = lastRecvTimestamp;
                        }
                        chats.push(chat);
                    }
                }
            }
            catch (err) {
                // ignore failed conversation metadata
            }
        }
    });
    return {
        chats,
        contacts,
        messages,
        syncType,
        progress,
        nctSalt,
        conversations
    };
};
exports.processHistorySyncBuffer = processHistorySyncBuffer;
const processHistoryMessage = (item) => {
    var _a, _b, _c;
    const messages = [];
    const contacts = [];
    const chats = [];
    switch (item.syncType) {
        case WAProto_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP:
        case WAProto_1.proto.HistorySync.HistorySyncType.RECENT:
        case WAProto_1.proto.HistorySync.HistorySyncType.FULL:
        case WAProto_1.proto.HistorySync.HistorySyncType.ON_DEMAND:
            for (const chat of item.conversations) {
                contacts.push({
                    id: chat.id,
                    name: chat.name || undefined,
                    lid: chat.lidJid || undefined,
                    jid: (0, WABinary_1.isJidUser)(chat.id) ? chat.id : undefined
                });
                const msgs = chat.messages || [];
                delete chat.messages;
                for (const item of msgs) {
                    const message = item.message;
                    messages.push(message);
                    if (!((_a = chat.messages) === null || _a === void 0 ? void 0 : _a.length)) {
                        // keep only the most recent message in the chat array
                        chat.messages = [{ message }];
                    }
                    if (!message.key.fromMe && !chat.lastMessageRecvTimestamp) {
                        chat.lastMessageRecvTimestamp = (0, generics_1.toNumber)(message.messageTimestamp);
                    }
                    if ((message.messageStubType === Types_1.WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP ||
                        message.messageStubType === Types_1.WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) &&
                        ((_b = message.messageStubParameters) === null || _b === void 0 ? void 0 : _b[0])) {
                        contacts.push({
                            id: message.key.participant || message.key.remoteJid,
                            verifiedName: (_c = message.messageStubParameters) === null || _c === void 0 ? void 0 : _c[0]
                        });
                    }
                }
                chats.push({ ...chat });
            }
            break;
        case WAProto_1.proto.HistorySync.HistorySyncType.PUSH_NAME:
            for (const c of item.pushnames) {
                contacts.push({ id: c.id, notify: c.pushname });
            }
            break;
    }
    return {
        chats,
        contacts,
        messages,
        syncType: item.syncType,
        progress: item.progress
    };
};
exports.processHistoryMessage = processHistoryMessage;
const downloadAndProcessHistorySyncNotification = async (msg, options) => {
    const buffer = await (0, exports.downloadHistoryBuffer)(msg, options);
    return (0, exports.processHistorySyncBuffer)(buffer);
};
exports.downloadAndProcessHistorySyncNotification = downloadAndProcessHistorySyncNotification;
const getHistoryMsg = (message) => {
    var _a;
    const normalizedContent = !!message ? (0, messages_1.normalizeMessageContent)(message) : undefined;
    const anyHistoryMsg = (_a = normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.protocolMessage) === null || _a === void 0 ? void 0 : _a.historySyncNotification;
    return anyHistoryMsg;
};
exports.getHistoryMsg = getHistoryMsg;
