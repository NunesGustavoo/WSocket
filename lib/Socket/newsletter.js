"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeNewsletterSocket = void 0;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const WAProto_1 = require("../../WAProto");
const mex_query_1 = require("../Types/mex-query");
const generics_1 = require("../Utils/generics");
const newsletter_messages_1 = require("../Utils/newsletter-messages");
const newsletter_media_1 = require("../Utils/newsletter-media");
const newsletter_metadata_1 = require("../Utils/newsletter-metadata");
const newsletter_post_1 = require("../Utils/newsletter-post");
const WABinary_1 = require("../WABinary");
const messages_recv_1 = require("./messages-recv");
const DEFAULT_ACK_TIMEOUT_MS = 30000;
const MIN_ACK_TIMEOUT_MS = 5000;
const badRequest = (message) => new boom_1.Boom(message, { statusCode: 400 });
// resposta null do mex (ID trocado, por exemplo) nunca vira sucesso
const emptyResponse = (operation) => new boom_1.Boom(`Resposta vazia do WhatsApp (${operation})`, { statusCode: 502, data: { empty: true, operation } });
const assertChannelJid = (jid) => {
    if (!(0, WABinary_1.isJidNewsletter)(jid))
        throw badRequest(`JID de canal inválido: ${jid}`);
};
// PN em `user_id` volta 400 do WhatsApp; falha antes de gastar a IQ
const assertLid = (userId) => {
    if (!(userId === null || userId === void 0 ? void 0 : userId.endsWith('@lid')))
        throw badRequest('user_id das operações de admin precisa ser LID (<n>@lid)');
};
const toMetadata = (raw, operation) => {
    var _a;
    if (!raw)
        throw emptyResponse(operation);
    const metadata = (0, newsletter_metadata_1.parseNewsletterMetadata)(raw);
    if (!metadata) {
        throw new boom_1.Boom('Canal não encontrado', { statusCode: 404, data: { stateType: (_a = raw.state) === null || _a === void 0 ? void 0 : _a.type } });
    }
    return metadata;
};
const makeNewsletterSocket = (config) => {
    const sock = (0, messages_recv_1.makeMessagesRecvSocket)(config);
    const { mexQuery, query, relayMessage, refreshMediaConn, generateMessageTag } = sock;
    const { logger } = config;
    const fetchMetadata = async (key, type) => {
        const raw = await mexQuery({
            input: { key, type, view_role: 'SUBSCRIBER' },
            fetch_viewer_metadata: true,
            fetch_full_image: type !== 'INVITE',
            fetch_creation_time: true,
            fetch_wamo_sub: false,
            fetch_status_metadata: false,
            fetch_pinned_messages: true,
        }, mex_query_1.MexQueryId.NewsletterFetch, 'xwa2_newsletter');
        return toMetadata(raw, 'metadata');
    };
    /** Lista vazia é `[]`; sem `subscribersCount`, e `pictureDirectPath` é o preview */
    async function newsletterList() {
        const raw = await mexQuery({ fetch_wamo_sub: false, fetch_status_metadata: false }, mex_query_1.MexQueryId.NewsletterFetchAll, 'xwa2_newsletter_subscribed');
        if (!raw)
            throw emptyResponse('list');
        // lenient: um canal suspenso sem thread_metadata não pode derrubar a listagem inteira
        return raw.map(item => (0, newsletter_metadata_1.parseNewsletterMetadata)(item, { lenient: true })).filter((item) => !!item);
    }
    /** Boom 404 (`data.stateType`) se o canal não existe ou foi apagado */
    const newsletterMetadata = (jid) => {
        assertChannelJid(jid);
        return fetchMetadata(jid, 'JID');
    };
    /** `inviteCode` é só o código (não o link). `role` vem null. Boom 404 se não existe */
    async function newsletterMetadataByInvite(inviteCode) {
        if (!inviteCode)
            throw badRequest('inviteCode vazio');
        return fetchMetadata(inviteCode, 'INVITE');
    }
    /** `picture` já normalizada (ex.: `generateProfilePicture`, 640x640 JPEG) */
    async function newsletterCreate(params) {
        const input = { name: params.name };
        if (params.description !== undefined)
            input.description = params.description;
        if (params.picture)
            input.picture = params.picture.toString('base64');
        const raw = await mexQuery({ input }, mex_query_1.MexQueryId.NewsletterCreate, 'xwa2_newsletter_create');
        return toMetadata(raw, 'create');
    }
    /** `picture: null` remove a foto (vai como `""`; `null` volta 400); Boom 404 se o canal não existe */
    async function newsletterUpdate(jid, params) {
        assertChannelJid(jid);
        const updates = {};
        if (params.name !== undefined)
            updates.name = params.name;
        if (params.description !== undefined)
            updates.description = params.description;
        if (params.picture !== undefined)
            updates.picture = params.picture ? params.picture.toString('base64') : '';
        if (!Object.keys(updates).length)
            throw badRequest('Nada para atualizar no canal');
        const raw = await mexQuery({ newsletter_id: jid, updates }, mex_query_1.MexQueryId.NewsletterUpdate, 'xwa2_newsletter_update');
        return toMetadata(raw, 'update');
    }
    /** Boom 404 se o canal já não existe */
    async function newsletterDelete(jid) {
        var _a;
        assertChannelJid(jid);
        const raw = await mexQuery({ newsletter_id: jid }, mex_query_1.MexQueryId.NewsletterDelete, 'xwa2_newsletter_delete_v2');
        if (!raw)
            throw emptyResponse('delete');
        const stateType = (_a = raw.state) === null || _a === void 0 ? void 0 : _a.type;
        if (stateType === 'DELETED')
            return;
        if (stateType === 'NON_EXISTING') {
            throw new boom_1.Boom('Canal não encontrado', { statusCode: 404, data: { stateType } });
        }
        throw new boom_1.Boom(`Estado inesperado ao apagar o canal: ${stateType}`, {
            statusCode: 502,
            data: { stateType },
        });
    }
    /** `userLid` é LID; `dm.to` é o PN que recebe o card, sem o qual o convite não aparece no aparelho dele */
    async function newsletterAdminInvite(jid, userLid, dm) {
        var _a;
        assertChannelJid(jid);
        assertLid(userLid);
        const newsletterName = dm ? (_a = dm.newsletterName) !== null && _a !== void 0 ? _a : (await newsletterMetadata(jid)).name : '';
        const raw = await mexQuery({ newsletter_id: jid, user_id: userLid }, mex_query_1.MexQueryId.NewsletterAdminInviteCreate, 'xwa2_newsletter_admin_invite_create');
        if (!raw)
            throw emptyResponse('adminInvite');
        const expiresAt = (0, newsletter_metadata_1.parseAdminInviteExpiration)(raw);
        if (!expiresAt) {
            throw new boom_1.Boom('Resposta do WhatsApp sem invite_expiration_time', { statusCode: 502, data: raw });
        }
        let inviteMessageSent = false;
        if (dm) {
            try {
                const sentId = await relayMessage(dm.to, {
                    newsletterAdminInviteMessage: {
                        newsletterJid: jid,
                        newsletterName,
                        caption: dm.caption || undefined,
                        inviteExpiration: Math.floor(expiresAt / 1000),
                    },
                }, {});
                // relayMessage devolve null, sem lançar, quando não há device para cifrar
                inviteMessageSent = !!sentId;
                if (!sentId)
                    logger.warn('newsletter: convite de admin registrado, DM do card não saiu (sem conteúdo)');
            }
            catch (err) {
                logger.warn({ trace: err === null || err === void 0 ? void 0 : err.stack }, 'newsletter: convite de admin registrado, DM do card falhou');
            }
        }
        return { expiresAt, inviteMessageSent };
    }
    const adminMutation = async (operation, queryId, key, jid, userLid) => {
        assertChannelJid(jid);
        assertLid(userLid);
        const raw = await mexQuery({ newsletter_id: jid, user_id: userLid }, queryId, key);
        if (!raw)
            throw emptyResponse(operation);
    };
    const newsletterAdminInviteRevoke = (jid, userLid) => adminMutation('adminInviteRevoke', mex_query_1.MexQueryId.NewsletterAdminInviteRevoke, 'xwa2_newsletter_admin_invite_revoke', jid, userLid);
    const newsletterAdminDemote = (jid, userLid) => adminMutation('adminDemote', mex_query_1.MexQueryId.NewsletterAdminDemote, 'xwa2_newsletter_admin_demote', jid, userLid);
    // o ack volta com o id da stanza, então `query` espera por ele, mas não lança em `error="401"`
    const postPlaintext = async (jid, message, opts) => {
        var _a;
        const messageId = opts.messageId || (0, generics_1.generateMessageID)();
        const stanza = (0, newsletter_post_1.buildNewsletterPostStanza)({
            to: jid,
            id: messageId,
            encodedMessage: WAProto_1.proto.Message.encode(opts.question ? (0, newsletter_post_1.buildNewsletterQuestionMessage)(message) : message).finish(),
            media: opts.media,
            poll: opts.poll,
            question: opts.question,
        });
        try {
            const ack = await query(stanza, (_a = opts.timeoutMs) !== null && _a !== void 0 ? _a : DEFAULT_ACK_TIMEOUT_MS);
            return { messageId, ackAttrs: ack.attrs };
        }
        catch (err) {
            // no timeout o post pode ter saído: quem chama precisa do id para dizer qual
            if (err instanceof boom_1.Boom)
                err.data = { ...err.data, messageId };
            throw err;
        }
    };
    /** `ackAttrs.error` = o WhatsApp recusou; `ackAttrs.server_id` = postou. `timeoutMs` vale só para o ack (padrão 30 s); `question` posta como pergunta */
    async function newsletterSendText(jid, text, opts = {}) {
        assertChannelJid(jid);
        return postPlaintext(jid, { conversation: text }, opts);
    }
    const sendMedia = async (kind, jid, media, opts) => {
        assertChannelJid(jid);
        // falha antes do upload: o builder só lançaria o 400 depois de subir até 16 MiB
        if (opts.question && kind !== 'image')
            throw badRequest('Pergunta de canal só aceita texto ou imagem');
        const startedAt = Date.now();
        const { message, mediaId } = await (0, newsletter_media_1.prepareNewsletterMedia)(kind, media, {
            config,
            refreshMediaConn,
            caption: opts.caption,
            isAnimated: opts.isAnimated,
            timeoutMs: opts.timeoutMs,
        });
        const ackTimeoutMs = opts.timeoutMs
            ? Math.max(opts.timeoutMs - (Date.now() - startedAt), MIN_ACK_TIMEOUT_MS)
            : undefined;
        return postPlaintext(jid, message, {
            messageId: opts.messageId,
            media: { mediatype: kind, mediaId },
            timeoutMs: ackTimeoutMs,
            question: opts.question,
        });
    };
    /** `image` JPEG ou PNG (Boom 400 se não for); `timeoutMs` é o orçamento total de upload mais ack (padrão 60 s + 30 s); `question` posta a legenda como pergunta */
    async function newsletterSendImage(jid, image, opts = {}) {
        return sendMedia('image', jid, image, opts);
    }
    /** `video` MP4 (Boom 400 se não for); `gifPlayback` posta como GIF; `timeoutMs` como no `newsletterSendImage` */
    async function newsletterSendVideo(jid, video, opts = {}) {
        return sendMedia(opts.gifPlayback ? 'gif' : 'video', jid, video, opts);
    }
    /** `audio` OGG/Opus (Boom 400 se não for); `ptt` posta como nota de voz; `timeoutMs` como no `newsletterSendImage` */
    async function newsletterSendAudio(jid, audio, opts = {}) {
        return sendMedia(opts.ptt ? 'ptt' : 'audio', jid, audio, opts);
    }
    /** `sticker` WebP (Boom 400 se não for); sem `isAnimated`, detecta pelo chunk ANIM; `timeoutMs` como no `newsletterSendImage` */
    async function newsletterSendSticker(jid, sticker, opts = {}) {
        return sendMedia('sticker', jid, sticker, opts);
    }
    /** `selectableCount` 1 = escolha única, 0 = múltipla; `timeoutMs` vale só para o ack (padrão 30 s) */
    async function newsletterSendPoll(jid, poll, opts = {}) {
        assertChannelJid(jid);
        if (poll.selectableCount !== 0 && poll.selectableCount !== 1) {
            throw badRequest('selectableCount da enquete de canal precisa ser 0 (múltipla) ou 1 (única)');
        }
        return postPlaintext(jid, (0, newsletter_post_1.buildNewsletterPollMessage)(poll, (0, crypto_1.randomBytes)(32)), { ...opts, poll: true });
    }
    const assertPageParams = (count, before) => {
        if (!(0, newsletter_messages_1.isNewsletterPageCount)(count))
            throw badRequest('count precisa ser inteiro de 1 a 100');
        if (before != null && !(0, newsletter_messages_1.isNewsletterServerId)(before))
            throw badRequest('before precisa ser só dígitos (id do último item)');
    };
    /** Posts do canal na ordem do servidor; `before` = `serverId` de um post */
    async function newsletterFetchMessages(jid, { count, before }) {
        assertChannelJid(jid);
        assertPageParams(count, before);
        const result = await query((0, newsletter_messages_1.buildNewsletterMessagesIq)(jid, count, before), 20000);
        // ponytail: result sem <messages> vira página vazia; não medido no WhatsApp real
        const list = (0, WABinary_1.getBinaryNodeChild)(result, 'messages');
        return (0, newsletter_messages_1.parseNewsletterPosts)(list, count, bytes => WAProto_1.proto.Message.decode(bytes));
    }
    /** Respostas de uma pergunta (só dona e admin); `serverId` da pergunta, `before` = `responseServerId` da última da página anterior */
    async function newsletterQuestionResponses(jid, serverId, { count, before }) {
        assertChannelJid(jid);
        if (!(0, newsletter_messages_1.isNewsletterServerId)(serverId))
            throw badRequest('serverId precisa ser só dígitos');
        assertPageParams(count, before);
        const result = await query((0, newsletter_messages_1.buildNewsletterQuestionResponsesIq)(jid, serverId, count, before), 20000);
        // ponytail: result sem <question_responses> vira página vazia; não medido no WhatsApp real
        const list = (0, WABinary_1.getBinaryNodeChild)(result, 'question_responses');
        return (0, newsletter_messages_1.parseNewsletterQuestionResponses)(list, count, bytes => WAProto_1.proto.Message.decode(bytes));
    }
    const simpleMutation = async (jid, queryId, key) => {
        assertChannelJid(jid);
        await mexQuery({ newsletter_id: jid }, queryId, key);
    };
    const newsletterFollow = (jid) => simpleMutation(jid, mex_query_1.MexQueryId.NewsletterFollow, 'xwa2_newsletter_follow');
    const newsletterUnfollow = (jid) => simpleMutation(jid, mex_query_1.MexQueryId.NewsletterUnfollow, 'xwa2_newsletter_unfollow');
    const newsletterMute = (jid) => simpleMutation(jid, mex_query_1.MexQueryId.NewsletterMute, 'xwa2_newsletter_mute_v2');
    const newsletterUnmute = (jid) => simpleMutation(jid, mex_query_1.MexQueryId.NewsletterUnmute, 'xwa2_newsletter_unmute_v2');
    async function newsletterAdminCount(jid) {
        assertChannelJid(jid);
        const raw = await mexQuery({ newsletter_id: jid }, mex_query_1.MexQueryId.NewsletterAdminCount, 'xwa2_newsletter_admin');
        if (!raw)
            throw emptyResponse('adminCount');
        return raw.admin_count;
    }
    async function newsletterChangeOwner(jid, newOwnerLid) {
        assertChannelJid(jid);
        assertLid(newOwnerLid);
        const raw = await mexQuery({ newsletter_id: jid, user_id: newOwnerLid }, mex_query_1.MexQueryId.NewsletterChangeOwner, 'xwa2_newsletter_change_owner');
        if (!raw)
            throw emptyResponse('changeOwner');
    }
    /** `reaction` vazio remove a reação; `serverId` é o do post */
    async function newsletterReactMessage(jid, serverId, reaction) {
        assertChannelJid(jid);
        await query({
            tag: 'message',
            attrs: {
                to: jid,
                ...(reaction ? {} : { edit: '7' }),
                type: 'reaction',
                server_id: serverId,
                id: generateMessageTag(),
            },
            content: [{ tag: 'reaction', attrs: reaction ? { code: reaction } : {} }],
        });
    }
    /** Liga as atualizações ao vivo do canal; devolve a duração da assinatura, ou null */
    async function subscribeNewsletterUpdates(jid) {
        var _a, _b;
        assertChannelJid(jid);
        const result = await query({
            tag: 'iq',
            attrs: { id: generateMessageTag(), type: 'set', xmlns: 'newsletter', to: jid },
            content: [{ tag: 'live_updates', attrs: {}, content: [] }],
        });
        const duration = (_b = (_a = (0, WABinary_1.getBinaryNodeChild)(result, 'live_updates')) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.duration;
        return duration ? { duration } : null;
    }
    return {
        ...sock,
        newsletterFollow,
        newsletterUnfollow,
        newsletterMute,
        newsletterUnmute,
        newsletterAdminCount,
        newsletterChangeOwner,
        newsletterReactMessage,
        subscribeNewsletterUpdates,
        newsletterFetchMessages,
        newsletterQuestionResponses,
        newsletterList,
        newsletterMetadata,
        newsletterMetadataByInvite,
        newsletterCreate,
        newsletterUpdate,
        newsletterDelete,
        newsletterAdminInvite,
        newsletterAdminInviteRevoke,
        newsletterAdminDemote,
        newsletterSendText,
        newsletterSendImage,
        newsletterSendVideo,
        newsletterSendAudio,
        newsletterSendSticker,
        newsletterSendPoll,
    };
};
exports.makeNewsletterSocket = makeNewsletterSocket;
