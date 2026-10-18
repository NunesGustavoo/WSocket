import { Boom } from '@hapi/boom';
import { randomBytes } from 'crypto';
import { proto } from '../../WAProto';
import { SocketConfig } from '../Types';
import { MexQueryId } from '../Types/mex-query';
import type {
	NewsletterAdminInviteResult,
	NewsletterMediaKind,
	NewsletterMetadata,
	NewsletterPoll,
	NewsletterPost,
	NewsletterQuestionResponse,
	NewsletterSendResult,
	Xwa2Newsletter,
	Xwa2NewsletterAdminInviteCreate,
	Xwa2NewsletterDelete,
	Xwa2NewsletterMutationResponse,
} from '../Types/Newsletter';
import { generateMessageID } from '../Utils/generics';
import {
	buildNewsletterMessagesIq,
	buildNewsletterQuestionResponsesIq,
	isNewsletterPageCount,
	isNewsletterServerId,
	parseNewsletterPosts,
	parseNewsletterQuestionResponses,
} from '../Utils/newsletter-messages';
import { prepareNewsletterMedia } from '../Utils/newsletter-media';
import { parseAdminInviteExpiration, parseNewsletterMetadata } from '../Utils/newsletter-metadata';
import { buildNewsletterPollMessage, buildNewsletterPostStanza, buildNewsletterQuestionMessage } from '../Utils/newsletter-post';
import { getBinaryNodeChild, isJidNewsletter } from '../WABinary';
import { makeMessagesRecvSocket } from './messages-recv';

const DEFAULT_ACK_TIMEOUT_MS = 30_000;
const MIN_ACK_TIMEOUT_MS = 5_000;

const badRequest = (message: string) => new Boom(message, { statusCode: 400 });

// resposta null do mex (ID trocado, por exemplo) nunca vira sucesso
const emptyResponse = (operation: string) =>
	new Boom(`Resposta vazia do WhatsApp (${operation})`, { statusCode: 502, data: { empty: true, operation } });

const assertChannelJid = (jid: string) => {
	if (!isJidNewsletter(jid)) throw badRequest(`JID de canal inválido: ${jid}`);
};

// PN em `user_id` volta 400 do WhatsApp; falha antes de gastar a IQ
const assertLid = (userId: string) => {
	if (!userId?.endsWith('@lid')) throw badRequest('user_id das operações de admin precisa ser LID (<n>@lid)');
};

const toMetadata = (raw: Xwa2Newsletter | null | undefined, operation: string): NewsletterMetadata => {
	if (!raw) throw emptyResponse(operation);
	const metadata = parseNewsletterMetadata(raw);
	if (!metadata) {
		throw new Boom('Canal não encontrado', { statusCode: 404, data: { stateType: raw.state?.type } });
	}
	return metadata;
};

export const makeNewsletterSocket = (config: SocketConfig) => {
	const sock = makeMessagesRecvSocket(config);
	const { mexQuery, query, relayMessage, refreshMediaConn, generateMessageTag } = sock;
	const { logger } = config;

	const fetchMetadata = async (key: string, type: 'JID' | 'INVITE') => {
		const raw = await mexQuery<Xwa2Newsletter>(
			{
				input: { key, type, view_role: 'SUBSCRIBER' },
				fetch_viewer_metadata: true,
				fetch_full_image: type !== 'INVITE',
				fetch_creation_time: true,
				fetch_wamo_sub: false,
				fetch_status_metadata: false,
				fetch_pinned_messages: true,
			},
			MexQueryId.NewsletterFetch,
			'xwa2_newsletter',
		);
		return toMetadata(raw, 'metadata');
	};

	/** Lista vazia é `[]`; sem `subscribersCount`, e `pictureDirectPath` é o preview */
	async function newsletterList(): Promise<NewsletterMetadata[]> {
		const raw = await mexQuery<Xwa2Newsletter[]>(
			{ fetch_wamo_sub: false, fetch_status_metadata: false },
			MexQueryId.NewsletterFetchAll,
			'xwa2_newsletter_subscribed',
		);
		if (!raw) throw emptyResponse('list');
		// lenient: um canal suspenso sem thread_metadata não pode derrubar a listagem inteira
		return raw.map(item => parseNewsletterMetadata(item, { lenient: true })).filter((item): item is NewsletterMetadata => !!item);
	}

	/** Boom 404 (`data.stateType`) se o canal não existe ou foi apagado */
	const newsletterMetadata = (jid: string) => {
		assertChannelJid(jid);
		return fetchMetadata(jid, 'JID');
	};

	/** `inviteCode` é só o código (não o link). `role` vem null. Boom 404 se não existe */
	async function newsletterMetadataByInvite(inviteCode: string) {
		if (!inviteCode) throw badRequest('inviteCode vazio');
		return fetchMetadata(inviteCode, 'INVITE');
	}

	/** `picture` já normalizada (ex.: `generateProfilePicture`, 640x640 JPEG) */
	async function newsletterCreate(params: {
		name: string;
		description?: string;
		picture?: Buffer;
	}): Promise<NewsletterMetadata> {
		const input: Record<string, string> = { name: params.name };
		if (params.description !== undefined) input.description = params.description;
		if (params.picture) input.picture = params.picture.toString('base64');

		const raw = await mexQuery<Xwa2Newsletter>(
			{ input },
			MexQueryId.NewsletterCreate,
			'xwa2_newsletter_create',
		);
		return toMetadata(raw, 'create');
	}

	/** `picture: null` remove a foto (vai como `""`; `null` volta 400); Boom 404 se o canal não existe */
	async function newsletterUpdate(
		jid: string,
		params: { name?: string; description?: string; picture?: Buffer | null },
	): Promise<NewsletterMetadata> {
		assertChannelJid(jid);
		const updates: Record<string, string> = {};
		if (params.name !== undefined) updates.name = params.name;
		if (params.description !== undefined) updates.description = params.description;
		if (params.picture !== undefined) updates.picture = params.picture ? params.picture.toString('base64') : '';
		if (!Object.keys(updates).length) throw badRequest('Nada para atualizar no canal');

		const raw = await mexQuery<Xwa2Newsletter>(
			{ newsletter_id: jid, updates },
			MexQueryId.NewsletterUpdate,
			'xwa2_newsletter_update',
		);
		return toMetadata(raw, 'update');
	}

	/** Boom 404 se o canal já não existe */
	async function newsletterDelete(jid: string): Promise<void> {
		assertChannelJid(jid);
		const raw = await mexQuery<Xwa2NewsletterDelete>(
			{ newsletter_id: jid },
			MexQueryId.NewsletterDelete,
			'xwa2_newsletter_delete_v2',
		);
		if (!raw) throw emptyResponse('delete');
		const stateType = raw.state?.type;
		if (stateType === 'DELETED') return;
		if (stateType === 'NON_EXISTING') {
			throw new Boom('Canal não encontrado', { statusCode: 404, data: { stateType } });
		}
		throw new Boom(`Estado inesperado ao apagar o canal: ${stateType}`, {
			statusCode: 502,
			data: { stateType },
		});
	}

	/** `userLid` é LID; `dm.to` é o PN que recebe o card, sem o qual o convite não aparece no aparelho dele */
	async function newsletterAdminInvite(
		jid: string,
		userLid: string,
		dm?: { to: string; newsletterName?: string; caption?: string },
	): Promise<NewsletterAdminInviteResult> {
		assertChannelJid(jid);
		assertLid(userLid);

		const newsletterName = dm ? dm.newsletterName ?? (await newsletterMetadata(jid)).name : '';

		const raw = await mexQuery<Xwa2NewsletterAdminInviteCreate>(
			{ newsletter_id: jid, user_id: userLid },
			MexQueryId.NewsletterAdminInviteCreate,
			'xwa2_newsletter_admin_invite_create',
		);
		if (!raw) throw emptyResponse('adminInvite');
		const expiresAt = parseAdminInviteExpiration(raw);
		if (!expiresAt) {
			throw new Boom('Resposta do WhatsApp sem invite_expiration_time', { statusCode: 502, data: raw });
		}

		let inviteMessageSent = false;
		if (dm) {
			try {
				const sentId = await relayMessage(
					dm.to,
					{
						newsletterAdminInviteMessage: {
							newsletterJid: jid,
							newsletterName,
							caption: dm.caption || undefined,
							inviteExpiration: Math.floor(expiresAt / 1000),
						},
					},
					{},
				);
				// relayMessage devolve null, sem lançar, quando não há device para cifrar
				inviteMessageSent = !!sentId;
				if (!sentId) logger.warn('newsletter: convite de admin registrado, DM do card não saiu (sem conteúdo)');
			} catch (err) {
				logger.warn({ trace: err?.stack }, 'newsletter: convite de admin registrado, DM do card falhou');
			}
		}

		return { expiresAt, inviteMessageSent };
	}

	const adminMutation = async (
		operation: string,
		queryId: MexQueryId,
		key: string,
		jid: string,
		userLid: string,
	) => {
		assertChannelJid(jid);
		assertLid(userLid);
		const raw = await mexQuery<Xwa2NewsletterMutationResponse>(
			{ newsletter_id: jid, user_id: userLid },
			queryId,
			key,
		);
		if (!raw) throw emptyResponse(operation);
	};

	const newsletterAdminInviteRevoke = (jid: string, userLid: string) =>
		adminMutation(
			'adminInviteRevoke',
			MexQueryId.NewsletterAdminInviteRevoke,
			'xwa2_newsletter_admin_invite_revoke',
			jid,
			userLid,
		);

	const newsletterAdminDemote = (jid: string, userLid: string) =>
		adminMutation(
			'adminDemote',
			MexQueryId.NewsletterAdminDemote,
			'xwa2_newsletter_admin_demote',
			jid,
			userLid,
		);

	// o ack volta com o id da stanza, então `query` espera por ele, mas não lança em `error="401"`
	const postPlaintext = async (
		jid: string,
		message: proto.IMessage,
		opts: {
			messageId?: string;
			timeoutMs?: number;
			media?: { mediatype: NewsletterMediaKind; mediaId: string };
			poll?: boolean;
			question?: boolean;
		},
	): Promise<NewsletterSendResult> => {
		const messageId = opts.messageId || generateMessageID();
		const stanza = buildNewsletterPostStanza({
			to: jid,
			id: messageId,
			encodedMessage: proto.Message.encode(opts.question ? buildNewsletterQuestionMessage(message) : message).finish(),
			media: opts.media,
			poll: opts.poll,
			question: opts.question,
		});

		try {
			const ack = await query(stanza, opts.timeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
			return { messageId, ackAttrs: ack.attrs };
		} catch (err) {
			// no timeout o post pode ter saído: quem chama precisa do id para dizer qual
			if (err instanceof Boom) err.data = { ...(err.data as object), messageId };
			throw err;
		}
	};

	/** `ackAttrs.error` = o WhatsApp recusou; `ackAttrs.server_id` = postou. `timeoutMs` vale só para o ack (padrão 30 s); `question` posta como pergunta */
	async function newsletterSendText(
		jid: string,
		text: string,
		opts: { messageId?: string; timeoutMs?: number; question?: boolean } = {},
	): Promise<NewsletterSendResult> {
		assertChannelJid(jid);
		return postPlaintext(jid, { conversation: text }, opts);
	}

	const sendMedia = async (
		kind: NewsletterMediaKind,
		jid: string,
		media: Buffer,
		opts: { caption?: string; isAnimated?: boolean; messageId?: string; timeoutMs?: number; question?: boolean },
	): Promise<NewsletterSendResult> => {
		assertChannelJid(jid);
		// falha antes do upload: o builder só lançaria o 400 depois de subir até 16 MiB
		if (opts.question && kind !== 'image') throw badRequest('Pergunta de canal só aceita texto ou imagem');
		const startedAt = Date.now();
		const { message, mediaId } = await prepareNewsletterMedia(kind, media, {
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
	async function newsletterSendImage(
		jid: string,
		image: Buffer,
		opts: { caption?: string; messageId?: string; timeoutMs?: number; question?: boolean } = {},
	): Promise<NewsletterSendResult> {
		return sendMedia('image', jid, image, opts);
	}

	/** `video` MP4 (Boom 400 se não for); `gifPlayback` posta como GIF; `timeoutMs` como no `newsletterSendImage` */
	async function newsletterSendVideo(
		jid: string,
		video: Buffer,
		opts: { caption?: string; gifPlayback?: boolean; messageId?: string; timeoutMs?: number } = {},
	): Promise<NewsletterSendResult> {
		return sendMedia(opts.gifPlayback ? 'gif' : 'video', jid, video, opts);
	}

	/** `audio` OGG/Opus (Boom 400 se não for); `ptt` posta como nota de voz; `timeoutMs` como no `newsletterSendImage` */
	async function newsletterSendAudio(
		jid: string,
		audio: Buffer,
		opts: { ptt?: boolean; messageId?: string; timeoutMs?: number } = {},
	): Promise<NewsletterSendResult> {
		return sendMedia(opts.ptt ? 'ptt' : 'audio', jid, audio, opts);
	}

	/** `sticker` WebP (Boom 400 se não for); sem `isAnimated`, detecta pelo chunk ANIM; `timeoutMs` como no `newsletterSendImage` */
	async function newsletterSendSticker(
		jid: string,
		sticker: Buffer,
		opts: { isAnimated?: boolean; messageId?: string; timeoutMs?: number } = {},
	): Promise<NewsletterSendResult> {
		return sendMedia('sticker', jid, sticker, opts);
	}

	/** `selectableCount` 1 = escolha única, 0 = múltipla; `timeoutMs` vale só para o ack (padrão 30 s) */
	async function newsletterSendPoll(
		jid: string,
		poll: NewsletterPoll,
		opts: { messageId?: string; timeoutMs?: number } = {},
	): Promise<NewsletterSendResult> {
		assertChannelJid(jid);
		if (poll.selectableCount !== 0 && poll.selectableCount !== 1) {
			throw badRequest('selectableCount da enquete de canal precisa ser 0 (múltipla) ou 1 (única)');
		}
		return postPlaintext(jid, buildNewsletterPollMessage(poll, randomBytes(32)), { ...opts, poll: true });
	}

	const assertPageParams = (count: number, before?: string | null) => {
		if (!isNewsletterPageCount(count)) throw badRequest('count precisa ser inteiro de 1 a 100');
		if (before != null && !isNewsletterServerId(before)) throw badRequest('before precisa ser só dígitos (id do último item)');
	};

	/** Posts do canal na ordem do servidor; `before` = `serverId` de um post */
	async function newsletterFetchMessages(
		jid: string,
		{ count, before }: { count: number; before?: string | null },
	): Promise<{ messages: NewsletterPost[]; nextBefore: string | null; hasNextPage: boolean }> {
		assertChannelJid(jid);
		assertPageParams(count, before);
		const result = await query(buildNewsletterMessagesIq(jid, count, before), 20_000);
		// ponytail: result sem <messages> vira página vazia; não medido no WhatsApp real
		const list = getBinaryNodeChild(result, 'messages');
		return parseNewsletterPosts(list, count, bytes => proto.Message.decode(bytes));
	}

	/** Respostas de uma pergunta (só dona e admin); `serverId` da pergunta, `before` = `responseServerId` da última da página anterior */
	async function newsletterQuestionResponses(
		jid: string,
		serverId: string,
		{ count, before }: { count: number; before?: string | null },
	): Promise<{ responses: NewsletterQuestionResponse[]; nextBefore: string | null; hasNextPage: boolean }> {
		assertChannelJid(jid);
		if (!isNewsletterServerId(serverId)) throw badRequest('serverId precisa ser só dígitos');
		assertPageParams(count, before);
		const result = await query(buildNewsletterQuestionResponsesIq(jid, serverId, count, before), 20_000);
		// ponytail: result sem <question_responses> vira página vazia; não medido no WhatsApp real
		const list = getBinaryNodeChild(result, 'question_responses');
		return parseNewsletterQuestionResponses(list, count, bytes => proto.Message.decode(bytes));
	}

	const simpleMutation = async (jid: string, queryId: MexQueryId, key: string) => {
		assertChannelJid(jid);
		await mexQuery({ newsletter_id: jid }, queryId, key);
	};

	const newsletterFollow = (jid: string) =>
		simpleMutation(jid, MexQueryId.NewsletterFollow, 'xwa2_newsletter_follow');
	const newsletterUnfollow = (jid: string) =>
		simpleMutation(jid, MexQueryId.NewsletterUnfollow, 'xwa2_newsletter_unfollow');
	const newsletterMute = (jid: string) =>
		simpleMutation(jid, MexQueryId.NewsletterMute, 'xwa2_newsletter_mute_v2');
	const newsletterUnmute = (jid: string) =>
		simpleMutation(jid, MexQueryId.NewsletterUnmute, 'xwa2_newsletter_unmute_v2');

	async function newsletterAdminCount(jid: string): Promise<number> {
		assertChannelJid(jid);
		const raw = await mexQuery<{ admin_count: number }>(
			{ newsletter_id: jid },
			MexQueryId.NewsletterAdminCount,
			'xwa2_newsletter_admin',
		);
		if (!raw) throw emptyResponse('adminCount');
		return raw.admin_count;
	}

	async function newsletterChangeOwner(jid: string, newOwnerLid: string): Promise<void> {
		assertChannelJid(jid);
		assertLid(newOwnerLid);
		const raw = await mexQuery(
			{ newsletter_id: jid, user_id: newOwnerLid },
			MexQueryId.NewsletterChangeOwner,
			'xwa2_newsletter_change_owner',
		);
		if (!raw) throw emptyResponse('changeOwner');
	}

	/** `reaction` vazio remove a reação; `serverId` é o do post */
	async function newsletterReactMessage(jid: string, serverId: string, reaction?: string): Promise<void> {
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
	async function subscribeNewsletterUpdates(jid: string): Promise<{ duration: string } | null> {
		assertChannelJid(jid);
		const result = await query({
			tag: 'iq',
			attrs: { id: generateMessageTag(), type: 'set', xmlns: 'newsletter', to: jid },
			content: [{ tag: 'live_updates', attrs: {}, content: [] }],
		});
		const duration = getBinaryNodeChild(result, 'live_updates')?.attrs?.duration;
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
