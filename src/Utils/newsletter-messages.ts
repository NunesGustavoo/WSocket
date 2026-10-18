import type {
	NewsletterPage,
	NewsletterPost,
	NewsletterPostType,
	NewsletterQuestionResponse,
} from '../Types/Newsletter';
import type { BinaryNode } from '../WABinary';

// `proto.Message.decode` entra por parâmetro: o WAProto não resolve no `node --test` sem build
export type DecodeMessage = (bytes: Uint8Array) => any;

const SERVER_ID_REGEX = /^[1-9]\d{0,18}$/;
const MEDIA_TYPES: readonly string[] = ['image', 'video', 'gif', 'audio', 'ptt', 'sticker', 'document'];

export const isNewsletterServerId = (value: unknown): value is string =>
	typeof value === 'string' && SERVER_ID_REGEX.test(value);

export const isNewsletterPageCount = (count: unknown): count is number =>
	Number.isInteger(count) && (count as number) >= 1 && (count as number) <= 100;

/** `<messages type="jid">` vai para s.whatsapp.net */
export function buildNewsletterMessagesIq(jid: string, count: number, before?: string | null): BinaryNode {
	return {
		tag: 'iq',
		attrs: { type: 'get', to: '@s.whatsapp.net', xmlns: 'newsletter' },
		content: [{ tag: 'messages', attrs: { type: 'jid', jid, count: String(count), ...(before ? { before } : {}) } }],
	};
}

/** ao contrário dos posts, o IQ de respostas vai para o JID do canal */
export function buildNewsletterQuestionResponsesIq(
	jid: string,
	serverId: string,
	count: number,
	before?: string | null,
): BinaryNode {
	return {
		tag: 'iq',
		attrs: { type: 'get', to: jid, xmlns: 'newsletter' },
		content: [
			{ tag: 'question_responses', attrs: { server_id: serverId, count: String(count), ...(before ? { before } : {}) } },
		],
	};
}

const children = (node: BinaryNode | undefined, tag: string): BinaryNode[] =>
	Array.isArray(node?.content) ? node!.content.filter(child => child.tag === tag) : [];

const child = (node: BinaryNode | undefined, tag: string) => children(node, tag)[0];

// t ausente nunca apareceu nas capturas; epoch mantém o item na página e o contrato em string
const toIso = (t: string | undefined) => {
	const ms = Number(t) * 1000;
	return new Date(Number.isFinite(ms) ? ms : 0).toISOString();
};

const toCount = (node: BinaryNode | undefined) => {
	const value = node?.attrs?.count;
	if (value === undefined || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

// plaintext que não decodifica vira null: descartar o item faria nextBefore e hasNextPage mentirem
const decodePlaintext = (stanza: BinaryNode, decode: DecodeMessage) => {
	const bytes = child(stanza, 'plaintext')?.content;
	if (!(bytes instanceof Uint8Array)) return null;
	try {
		return decode(bytes);
	} catch {
		return null;
	}
};

const orNull = (text: unknown) => (typeof text === 'string' && text ? text : null);

// pergunta e enquete v4 chegam embrulhadas em FutureProofMessage
function extractText(message: any): string | null {
	if (!message) return null;
	return (
		orNull(message.conversation) ??
		orNull(message.extendedTextMessage?.text) ??
		orNull(message.imageMessage?.caption) ??
		orNull(message.videoMessage?.caption) ??
		orNull(message.documentMessage?.caption) ??
		orNull(
			(
				message.pollCreationMessage ??
				message.pollCreationMessageV2 ??
				message.pollCreationMessageV3 ??
				message.pollCreationMessageV5
			)?.name,
		) ??
		extractText(message.questionMessage?.message) ??
		extractText(message.pollCreationMessageV4?.message)
	);
}

function postType(stanza: BinaryNode, message: any): NewsletterPostType {
	const meta = child(stanza, 'meta');
	if (meta?.attrs?.questiontype === 'question' || message?.questionMessage) return 'question';
	if (meta?.attrs?.polltype === 'creation' || stanza.attrs.type === 'poll') return 'poll';
	if (stanza.attrs.type === 'media') {
		const mediatype = child(stanza, 'plaintext')?.attrs?.mediatype;
		return MEDIA_TYPES.includes(mediatype) ? (mediatype as NewsletterPostType) : 'unknown';
	}
	return stanza.attrs.type === 'text' ? 'text' : 'unknown';
}

const page = (items: { id: string }[], count: number) => ({
	nextBefore: items.length ? items[items.length - 1].id || null : null,
	hasNextPage: items.length === count,
});

/** `list` é o nó `<messages jid>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
export function parseNewsletterPosts(
	list: BinaryNode | undefined,
	count: number,
	decode: DecodeMessage,
): NewsletterPage<'messages', NewsletterPost> {
	const messages = children(list, 'message').map((stanza): NewsletterPost => {
		const message = decodePlaintext(stanza, decode);
		const type = postType(stanza, message);
		const responsesCount = toCount(child(stanza, 'responses_count'));
		return {
			serverId: stanza.attrs.server_id ?? '',
			messageId: stanza.attrs.id ?? '',
			type,
			text: extractText(message),
			createdAt: toIso(stanza.attrs.t),
			viewsCount: toCount(child(stanza, 'views_count')),
			forwardsCount: toCount(child(stanza, 'forwards_count')),
			responsesCount: responsesCount ?? (type === 'question' ? 0 : null),
		};
	});
	return { messages, ...page(messages.map(m => ({ id: m.serverId })), count) };
}

/** `list` é o nó `<question_responses server_id>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
export function parseNewsletterQuestionResponses(
	list: BinaryNode | undefined,
	count: number,
	decode: DecodeMessage,
): NewsletterPage<'responses', NewsletterQuestionResponse> {
	const responses = children(list, 'question_response').map((item): NewsletterQuestionResponse => {
		const stanza = child(item, 'message');
		const sender = child(item, 'sender');
		return {
			responseServerId: child(stanza, 'meta')?.attrs?.response_server_id ?? '',
			messageId: stanza?.attrs?.id ?? '',
			text: stanza ? orNull(decodePlaintext(stanza, decode)?.questionResponseMessage?.text) : null,
			createdAt: toIso(stanza?.attrs?.t),
			sender: { lid: sender?.attrs?.lid ?? '', name: sender?.attrs?.notify_name || null },
		};
	});
	return { responses, ...page(responses.map(r => ({ id: r.responseServerId })), count) };
}
