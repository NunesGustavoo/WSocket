"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MexQueryId = void 0;
var MexQueryId;
(function (MexQueryId) {
    MexQueryId["WAWebMexFetchGroupInfoJobQuery"] = "10065560693498563";
    MexQueryId["WAWebMexFetchAboutStatusJobQuery"] = "24535500086059408";
    MexQueryId["WAWebMexFetchAllSubgroupsJobQuery"] = "9935467776504344";
    MexQueryId["WAWebMexFetchReachoutTimelockJobQuery"] = "23983697327930364";
    // Canais (IDs do zapo, spec/mex/index.js; medidos no WhatsApp real)
    MexQueryId["NewsletterCreate"] = "25149874324715067";
    MexQueryId["NewsletterFetch"] = "27456920720571478";
    MexQueryId["NewsletterFetchAll"] = "25399611239711790";
    MexQueryId["NewsletterUpdate"] = "24250201037901610";
    MexQueryId["NewsletterDelete"] = "30062808666639665";
    MexQueryId["NewsletterAdminInviteCreate"] = "9387141988078609";
    MexQueryId["NewsletterAdminInviteRevoke"] = "9656078347839416";
    MexQueryId["NewsletterAdminDemote"] = "9880997548630971";
    MexQueryId["NewsletterPendingAdminInvites"] = "9783111038412085";
    MexQueryId["NewsletterAdminInfo"] = "26278439461859188";
    // shortcut: IDs herdados do socket antigo do Baileys, não medidos; conferir no WhatsApp real antes de confiar
    MexQueryId["NewsletterFollow"] = "7871414976211147";
    MexQueryId["NewsletterUnfollow"] = "7238632346214362";
    MexQueryId["NewsletterMute"] = "29766401636284406";
    MexQueryId["NewsletterUnmute"] = "9864994326891137";
    MexQueryId["NewsletterAdminCount"] = "7130823597031706";
    MexQueryId["NewsletterChangeOwner"] = "7341777602580933";
})(MexQueryId || (exports.MexQueryId = MexQueryId = {}));
