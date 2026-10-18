"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNewsletterMetadata = parseNewsletterMetadata;
exports.parseAdminInviteExpiration = parseAdminInviteExpiration;
const toNumber = (value) => {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
// `""` aparece em preview.direct_path de canal sem foto
const orNull = (value) => value || null;
/** `null` = canal inexistente ou apagado (`NON_EXISTING`/`DELETED`, que o mex devolve sem erro); `lenient` aceita item sem `thread_metadata` (listagem) */
function parseNewsletterMetadata(raw, { lenient = false } = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const stateType = (_a = raw.state) === null || _a === void 0 ? void 0 : _a.type;
    if (stateType === 'NON_EXISTING' || stateType === 'DELETED' || !raw.id)
        return null;
    const meta = (_b = raw.thread_metadata) !== null && _b !== void 0 ? _b : (lenient ? {} : undefined);
    if (!meta)
        throw new Error(`Resposta do WhatsApp sem thread_metadata (${raw.id})`);
    return {
        id: raw.id,
        name: (_d = (_c = meta.name) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '',
        description: (_f = (_e = meta.description) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : null,
        inviteCode: orNull(meta.invite),
        // picture só vem no metadata; na listagem só há o preview 192x192
        pictureDirectPath: (_h = orNull((_g = meta.picture) === null || _g === void 0 ? void 0 : _g.direct_path)) !== null && _h !== void 0 ? _h : orNull((_j = meta.preview) === null || _j === void 0 ? void 0 : _j.direct_path),
        role: orNull((_k = raw.viewer_metadata) === null || _k === void 0 ? void 0 : _k.role),
        subscribersCount: toNumber(meta.subscribers_count),
        state: stateType !== null && stateType !== void 0 ? stateType : 'ACTIVE',
        verified: meta.verification === 'VERIFIED',
        creationTime: toNumber(meta.creation_time),
    };
}
/** `invite_expiration_time` vem em segundos; devolve ms, ou `null` se faltar ou não for número */
function parseAdminInviteExpiration(raw) {
    const seconds = toNumber(raw.invite_expiration_time);
    return seconds && seconds > 0 ? seconds * 1000 : null;
}
