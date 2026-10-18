"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNewsletterPageCount = exports.isNewsletterServerId = void 0;
exports.buildNewsletterMessagesIq = buildNewsletterMessagesIq;
exports.buildNewsletterQuestionResponsesIq = buildNewsletterQuestionResponsesIq;
exports.parseNewsletterPosts = parseNewsletterPosts;
exports.parseNewsletterQuestionResponses = parseNewsletterQuestionResponses;
const SERVER_ID_REGEX = /^[1-9]\d{0,18}$/;
const MEDIA_TYPES = ['image', 'video', 'gif', 'audio', 'ptt', 'sticker', 'document'];
const isNewsletterServerId = (value) => typeof value === 'string' && SERVER_ID_REGEX.test(value);
exports.isNewsletterServerId = isNewsletterServerId;
const isNewsletterPageCount = (count) => Number.isInteger(count) && count >= 1 && count <= 100;
exports.isNewsletterPageCount = isNewsletterPageCount;
/** `<messages type="jid">` vai para s.whatsapp.net */
function buildNewsletterMessagesIq(jid, count, before) {
    return {
        tag: 'iq',
        attrs: { type: 'get', to: '@s.whatsapp.net', xmlns: 'newsletter' },
        content: [{ tag: 'messages', attrs: { type: 'jid', jid, count: String(count), ...(before ? { before } : {}) } }],
    };
}
/** ao contrário dos posts, o IQ de respostas vai para o JID do canal */
function buildNewsletterQuestionResponsesIq(jid, serverId, count, before) {
    return {
        tag: 'iq',
        attrs: { type: 'get', to: jid, xmlns: 'newsletter' },
        content: [
            { tag: 'question_responses', attrs: { server_id: serverId, count: String(count), ...(before ? { before } : {}) } },
        ],
    };
}
const children = (node, tag) => Array.isArray(node === null || node === void 0 ? void 0 : node.content) ? node.content.filter(child => child.tag === tag) : [];
const child = (node, tag) => children(node, tag)[0];
// t ausente nunca apareceu nas capturas; epoch mantém o item na página e o contrato em string
const toIso = (t) => {
    const ms = Number(t) * 1000;
    return new Date(Number.isFinite(ms) ? ms : 0).toISOString();
};
const toCount = (node) => {
    var _a;
    const value = (_a = node === null || node === void 0 ? void 0 : node.attrs) === null || _a === void 0 ? void 0 : _a.count;
    if (value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
// plaintext que não decodifica vira null: descartar o item faria nextBefore e hasNextPage mentirem
const decodePlaintext = (stanza, decode) => {
    var _a;
    const bytes = (_a = child(stanza, 'plaintext')) === null || _a === void 0 ? void 0 : _a.content;
    if (!(bytes instanceof Uint8Array))
        return null;
    try {
        return decode(bytes);
    }
    catch (_b) {
        return null;
    }
};
const orNull = (text) => (typeof text === 'string' && text ? text : null);
// pergunta e enquete v4 chegam embrulhadas em FutureProofMessage
function extractText(message) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    if (!message)
        return null;
    return ((_r = (_p = (_j = (_g = (_e = (_c = (_a = orNull(message.conversation)) !== null && _a !== void 0 ? _a : orNull((_b = message.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.text)) !== null && _c !== void 0 ? _c : orNull((_d = message.imageMessage) === null || _d === void 0 ? void 0 : _d.caption)) !== null && _e !== void 0 ? _e : orNull((_f = message.videoMessage) === null || _f === void 0 ? void 0 : _f.caption)) !== null && _g !== void 0 ? _g : orNull((_h = message.documentMessage) === null || _h === void 0 ? void 0 : _h.caption)) !== null && _j !== void 0 ? _j : orNull((_o = ((_m = (_l = (_k = message.pollCreationMessage) !== null && _k !== void 0 ? _k : message.pollCreationMessageV2) !== null && _l !== void 0 ? _l : message.pollCreationMessageV3) !== null && _m !== void 0 ? _m : message.pollCreationMessageV5)) === null || _o === void 0 ? void 0 : _o.name)) !== null && _p !== void 0 ? _p : extractText((_q = message.questionMessage) === null || _q === void 0 ? void 0 : _q.message)) !== null && _r !== void 0 ? _r : extractText((_s = message.pollCreationMessageV4) === null || _s === void 0 ? void 0 : _s.message));
}
function postType(stanza, message) {
    var _a, _b, _c, _d;
    const meta = child(stanza, 'meta');
    if (((_a = meta === null || meta === void 0 ? void 0 : meta.attrs) === null || _a === void 0 ? void 0 : _a.questiontype) === 'question' || (message === null || message === void 0 ? void 0 : message.questionMessage))
        return 'question';
    if (((_b = meta === null || meta === void 0 ? void 0 : meta.attrs) === null || _b === void 0 ? void 0 : _b.polltype) === 'creation' || stanza.attrs.type === 'poll')
        return 'poll';
    if (stanza.attrs.type === 'media') {
        const mediatype = (_d = (_c = child(stanza, 'plaintext')) === null || _c === void 0 ? void 0 : _c.attrs) === null || _d === void 0 ? void 0 : _d.mediatype;
        return MEDIA_TYPES.includes(mediatype) ? mediatype : 'unknown';
    }
    return stanza.attrs.type === 'text' ? 'text' : 'unknown';
}
const page = (items, count) => ({
    nextBefore: items.length ? items[items.length - 1].id || null : null,
    hasNextPage: items.length === count,
});
/** `list` é o nó `<messages jid>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
function parseNewsletterPosts(list, count, decode) {
    const messages = children(list, 'message').map((stanza) => {
        var _a, _b;
        const message = decodePlaintext(stanza, decode);
        const type = postType(stanza, message);
        const responsesCount = toCount(child(stanza, 'responses_count'));
        return {
            serverId: (_a = stanza.attrs.server_id) !== null && _a !== void 0 ? _a : '',
            messageId: (_b = stanza.attrs.id) !== null && _b !== void 0 ? _b : '',
            type,
            text: extractText(message),
            createdAt: toIso(stanza.attrs.t),
            viewsCount: toCount(child(stanza, 'views_count')),
            forwardsCount: toCount(child(stanza, 'forwards_count')),
            responsesCount: responsesCount !== null && responsesCount !== void 0 ? responsesCount : (type === 'question' ? 0 : null),
        };
    });
    return { messages, ...page(messages.map(m => ({ id: m.serverId })), count) };
}
/** `list` é o nó `<question_responses server_id>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
function parseNewsletterQuestionResponses(list, count, decode) {
    const responses = children(list, 'question_response').map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const stanza = child(item, 'message');
        const sender = child(item, 'sender');
        return {
            responseServerId: (_c = (_b = (_a = child(stanza, 'meta')) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.response_server_id) !== null && _c !== void 0 ? _c : '',
            messageId: (_e = (_d = stanza === null || stanza === void 0 ? void 0 : stanza.attrs) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : '',
            text: stanza ? orNull((_g = (_f = decodePlaintext(stanza, decode)) === null || _f === void 0 ? void 0 : _f.questionResponseMessage) === null || _g === void 0 ? void 0 : _g.text) : null,
            createdAt: toIso((_h = stanza === null || stanza === void 0 ? void 0 : stanza.attrs) === null || _h === void 0 ? void 0 : _h.t),
            sender: { lid: (_k = (_j = sender === null || sender === void 0 ? void 0 : sender.attrs) === null || _j === void 0 ? void 0 : _j.lid) !== null && _k !== void 0 ? _k : '', name: ((_l = sender === null || sender === void 0 ? void 0 : sender.attrs) === null || _l === void 0 ? void 0 : _l.notify_name) || null },
        };
    });
    return { responses, ...page(responses.map(r => ({ id: r.responseServerId })), count) };
}
