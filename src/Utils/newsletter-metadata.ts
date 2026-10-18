import type { NewsletterMetadata, Xwa2Newsletter, Xwa2NewsletterAdminInviteCreate } from '../Types/Newsletter';

const toNumber = (value: string | number | null | undefined) => {
	if (value === null || value === undefined || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

// `""` aparece em preview.direct_path de canal sem foto
const orNull = (value: string | null | undefined) => value || null;

/** `null` = canal inexistente ou apagado (`NON_EXISTING`/`DELETED`, que o mex devolve sem erro); `lenient` aceita item sem `thread_metadata` (listagem) */
export function parseNewsletterMetadata(
	raw: Xwa2Newsletter,
	{ lenient = false }: { lenient?: boolean } = {},
): NewsletterMetadata | null {
	const stateType = raw.state?.type;
	if (stateType === 'NON_EXISTING' || stateType === 'DELETED' || !raw.id) return null;

	const meta = raw.thread_metadata ?? (lenient ? {} : undefined);
	if (!meta) throw new Error(`Resposta do WhatsApp sem thread_metadata (${raw.id})`);

	return {
		id: raw.id,
		name: meta.name?.text ?? '',
		description: meta.description?.text ?? null,
		inviteCode: orNull(meta.invite),
		// picture só vem no metadata; na listagem só há o preview 192x192
		pictureDirectPath: orNull(meta.picture?.direct_path) ?? orNull(meta.preview?.direct_path),
		role: orNull(raw.viewer_metadata?.role),
		subscribersCount: toNumber(meta.subscribers_count),
		state: stateType ?? 'ACTIVE',
		verified: meta.verification === 'VERIFIED',
		creationTime: toNumber(meta.creation_time),
	};
}

/** `invite_expiration_time` vem em segundos; devolve ms, ou `null` se faltar ou não for número */
export function parseAdminInviteExpiration(
	raw: Pick<Xwa2NewsletterAdminInviteCreate, 'invite_expiration_time'>,
): number | null {
	const seconds = toNumber(raw.invite_expiration_time);
	return seconds && seconds > 0 ? seconds * 1000 : null;
}
