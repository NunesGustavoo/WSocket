// `(string & {})` mantém o autocomplete e aceita valor novo do WhatsApp sem quebrar o parse
export type NewsletterRole = 'OWNER' | 'ADMIN' | 'SUBSCRIBER' | 'GUEST' | (string & {});

export type NewsletterState = 'ACTIVE' | 'SUSPENDED' | 'GEOSUSPENDED' | (string & {});

export interface NewsletterMetadata {
	/** `<n>@newsletter` */
	id: string;
	name: string;
	description: string | null;
	/** código do link público: `https://whatsapp.com/channel/<inviteCode>` */
	inviteCode: string | null;
	/** `picture.direct_path`, ou `preview.direct_path` (192x192) quando só ele vem, como na listagem; vazio vira null */
	pictureDirectPath: string | null;
	/** `viewer_metadata.role` cru; null na consulta por convite e no update */
	role: NewsletterRole | null;
	/** null na listagem e no update: o mex não traz */
	subscribersCount: number | null;
	state: NewsletterState;
	verified: boolean;
	/** segundos (epoch) */
	creationTime: number | null;
}

export interface Xwa2NewsletterText {
	id: string;
	text: string;
	update_time: string;
}

export interface Xwa2NewsletterPicture {
	direct_path: string;
	id: string;
	type: string;
}

export interface Xwa2NewsletterThreadMetadata {
	creation_time?: string | null;
	description?: Xwa2NewsletterText | null;
	handle?: string | null;
	invite?: string | null;
	name?: Xwa2NewsletterText | null;
	picture?: Xwa2NewsletterPicture | null;
	preview?: Xwa2NewsletterPicture | null;
	pinned_messages?: unknown[];
	settings?: { reaction_codes?: { value: string } };
	subscribers_count?: string | null;
	verification?: string | null;
}

/** Forma comum de `xwa2_newsletter`, `xwa2_newsletter_create`, `xwa2_newsletter_update` e dos itens de `xwa2_newsletter_subscribed` */
export interface Xwa2Newsletter {
	id: string | null;
	state?: { type: string } | null;
	thread_metadata?: Xwa2NewsletterThreadMetadata | null;
	viewer_metadata?: { role?: string | null; settings?: { type: string; value: string }[] } | null;
}

export interface Xwa2NewsletterDelete {
	id: string | null;
	state?: { type: string } | null;
}

export interface Xwa2NewsletterAdminInviteCreate {
	id: string;
	/** segundos (epoch), em string */
	invite_expiration_time?: string | number | null;
}

export interface Xwa2NewsletterMutationResponse {
	__typename?: string;
	id: string;
}

export interface NewsletterAdminInviteResult {
	/** ms (epoch) */
	expiresAt: number;
	/** `true` = DM saiu (não quer dizer entregue); `false` = sem DM pedida, ou ela falhou ou não saiu */
	inviteMessageSent: boolean;
}

export interface NewsletterSendResult {
	/** id da stanza; o mesmo do `ack` */
	messageId: string;
	/** `server_id` no sucesso, `error` (ex.: "401") na recusa; o `query` não lança em `error` */
	ackAttrs: { [key: string]: string };
}

export type NewsletterMediaKind = 'image' | 'video' | 'gif' | 'audio' | 'ptt' | 'sticker';

export interface NewsletterPoll {
	name: string;
	values: string[];
	/** 1 = escolha única; 0 = múltipla */
	selectableCount: 0 | 1;
}

export type NewsletterPostType =
	| 'text'
	| 'image'
	| 'video'
	| 'gif'
	| 'audio'
	| 'ptt'
	| 'sticker'
	| 'document'
	| 'poll'
	| 'question'
	| 'unknown';

/** Todos os ids são string: `response_server_id` tem 17 dígitos e passa de `Number.MAX_SAFE_INTEGER` */
export interface NewsletterPost {
	serverId: string;
	messageId: string;
	type: NewsletterPostType;
	/** legenda, texto, nome da enquete ou texto da pergunta; null se não houver ou o plaintext não decodificar */
	text: string | null;
	/** ISO, vem do `t` da stanza */
	createdAt: string;
	/** null quando o nó não veio (diferente de zero) */
	viewsCount: number | null;
	forwardsCount: number | null;
	/** null quando o nó não veio; 0 em `type: 'question'` sem nó (o WhatsApp só manda depois da primeira resposta) */
	responsesCount: number | null;
}

export interface NewsletterQuestionResponse {
	responseServerId: string;
	/** `id` da stanza (o `key` do proto aponta para a pergunta) */
	messageId: string;
	/** null se o plaintext não decodifica ou vem sem texto */
	text: string | null;
	createdAt: string;
	/** LID cru; a resposta não traz telefone */
	sender: { lid: string; name: string | null };
}

/** `hasNextPage` = itens recebidos === `count`; `nextBefore` = id do último item (null se vazio) */
export type NewsletterPage<K extends string, T> = Record<K, T[]> & { nextBefore: string | null; hasNextPage: boolean };
