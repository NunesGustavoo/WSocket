import type { NewsletterMediaKind } from '../Types/Newsletter';
/** Mimetype pelos magic bytes. Só JPEG e PNG */
export declare function sniffImageMimetype(buffer: Uint8Array): 'image/jpeg' | 'image/png' | null;
/** Mimetype declarado de cada kind de canal, só se os bytes baterem; áudio só OGG (MP3 não aparece no app) */
export declare function sniffNewsletterMimetype(kind: NewsletterMediaKind, buffer: Uint8Array): string | null;
