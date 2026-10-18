import { proto } from '../../WAProto';
import { MediaConnInfo, SocketConfig } from '../Types';
import type { NewsletterMediaKind } from '../Types/Newsletter';
export interface PreparedNewsletterMedia {
    message: proto.IMessage;
    /** vai em `media_id` na stanza */
    mediaId: string;
}
/** Mídia de canal vai pura, com o sha256 do arquivo como token (whatsmeow/zapo); `timeoutMs` é o orçamento total do upload */
export declare function prepareNewsletterMedia(kind: NewsletterMediaKind, media: Buffer, { config, refreshMediaConn, caption, isAnimated, timeoutMs, }: {
    config: SocketConfig;
    refreshMediaConn: (force: boolean) => Promise<MediaConnInfo>;
    caption?: string;
    isAnimated?: boolean;
    timeoutMs?: number;
}): Promise<PreparedNewsletterMedia>;
