import type { NewsletterMetadata, Xwa2Newsletter, Xwa2NewsletterAdminInviteCreate } from '../Types/Newsletter';
/** `null` = canal inexistente ou apagado (`NON_EXISTING`/`DELETED`, que o mex devolve sem erro); `lenient` aceita item sem `thread_metadata` (listagem) */
export declare function parseNewsletterMetadata(raw: Xwa2Newsletter, { lenient }?: {
    lenient?: boolean;
}): NewsletterMetadata | null;
/** `invite_expiration_time` vem em segundos; devolve ms, ou `null` se faltar ou não for número */
export declare function parseAdminInviteExpiration(raw: Pick<Xwa2NewsletterAdminInviteCreate, 'invite_expiration_time'>): number | null;
