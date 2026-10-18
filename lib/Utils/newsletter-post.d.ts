import type { proto } from '../../WAProto';
import type { NewsletterMediaKind, NewsletterPoll } from '../Types/Newsletter';
import type { BinaryNode } from '../WABinary';
/** Medido no WhatsApp real: o `mediatype` da stanza é o próprio kind */
export declare const NEWSLETTER_MEDIA_PATH_MAP: {
    readonly image: "/newsletter/newsletter-image";
    readonly video: "/newsletter/newsletter-video";
    readonly gif: "/newsletter/newsletter-gif";
    readonly audio: "/newsletter/newsletter-audio";
    readonly ptt: "/newsletter/newsletter-ptt";
    readonly sticker: "/newsletter/newsletter-sticker";
};
export interface NewsletterMediaFields {
    url: string;
    directPath: string;
    mimetype: string;
    fileSha256: Uint8Array;
    fileLength: number;
    caption?: string;
    jpegThumbnail?: Uint8Array;
    width?: number;
    height?: number;
    seconds?: number;
    waveform?: Uint8Array;
    isAnimated?: boolean;
}
/** Mídia de canal vai sem criptografia: sem `mediaKey` nem `fileEncSha256` */
export declare function buildNewsletterMediaMessage(kind: NewsletterMediaKind, f: NewsletterMediaFields): proto.IMessage;
/** 64 médias de amplitude, a maior vira 100, como o `getAudioWaveform`; silêncio e áudio curto não geram NaN */
export declare function reduceNewsletterWaveform(samples: Float32Array, blocks?: number): Uint8Array;
/** Escolha única vai em V3 e múltipla em V1, como medido em canal; sem `endDate` (não medido) */
export declare function buildNewsletterPollMessage(poll: NewsletterPoll, messageSecret: Uint8Array): proto.IMessage;
/** Pergunta de canal é texto ou imagem; `conversation` não tem `contextInfo`, então o texto vira `extendedTextMessage` (medido) */
export declare function buildNewsletterQuestionMessage(inner: proto.IMessage): proto.IMessage;
/** Stanza de post em canal no formato whatsmeow/zapo: `<plaintext>` sem Signal, com `mediatype` e `media_id` na mídia */
export declare function buildNewsletterPostStanza(params: {
    to: string;
    id: string;
    encodedMessage: Uint8Array;
    media?: {
        mediatype: NewsletterMediaKind;
        mediaId: string;
    };
    poll?: boolean;
    question?: boolean;
}): BinaryNode;
