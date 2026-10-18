export declare enum MexQueryId {
    WAWebMexFetchGroupInfoJobQuery = "10065560693498563",
    WAWebMexFetchAboutStatusJobQuery = "24535500086059408",
    WAWebMexFetchAllSubgroupsJobQuery = "9935467776504344",
    WAWebMexFetchReachoutTimelockJobQuery = "23983697327930364",
    NewsletterCreate = "25149874324715067",
    NewsletterFetch = "27456920720571478",
    NewsletterFetchAll = "25399611239711790",
    NewsletterUpdate = "24250201037901610",
    NewsletterDelete = "30062808666639665",
    NewsletterAdminInviteCreate = "9387141988078609",
    NewsletterAdminInviteRevoke = "9656078347839416",
    NewsletterAdminDemote = "9880997548630971",
    NewsletterPendingAdminInvites = "9783111038412085",
    NewsletterAdminInfo = "26278439461859188",
    NewsletterFollow = "7871414976211147",
    NewsletterUnfollow = "7238632346214362",
    NewsletterMute = "29766401636284406",
    NewsletterUnmute = "9864994326891137",
    NewsletterAdminCount = "7130823597031706",
    NewsletterChangeOwner = "7341777602580933"
}
export interface MexQueryResponse<T = any> {
    data: T;
    errors?: MexQueryError[];
}
interface MexQueryError {
    extensions: Extensions;
    message: string;
    path: string[];
}
interface Extensions {
    error_code: number;
    is_retryable: boolean;
    severity: string;
}
export {};
