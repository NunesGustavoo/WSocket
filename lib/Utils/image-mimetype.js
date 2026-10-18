"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sniffImageMimetype = sniffImageMimetype;
exports.sniffNewsletterMimetype = sniffNewsletterMimetype;
/** Mimetype pelos magic bytes. Só JPEG e PNG */
function sniffImageMimetype(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length >= png.length && png.every((byte, i) => buffer[i] === byte)) {
        return 'image/png';
    }
    return null;
}
const asciiAt = (buffer, offset, text) => buffer.length >= offset + text.length && [...text].every((ch, i) => buffer[offset + i] === ch.charCodeAt(0));
// contêineres ISO-BMFF que não são vídeo MP4 (imagem AVIF/HEIF, áudio M4A, QuickTime)
const NOT_MP4_BRANDS = ['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1', 'M4A ', 'M4B ', 'qt  '];
/** Mimetype declarado de cada kind de canal, só se os bytes baterem; áudio só OGG (MP3 não aparece no app) */
function sniffNewsletterMimetype(kind, buffer) {
    switch (kind) {
        case 'image':
            return sniffImageMimetype(buffer);
        case 'video':
        case 'gif':
            return asciiAt(buffer, 4, 'ftyp') && !NOT_MP4_BRANDS.some(brand => asciiAt(buffer, 8, brand))
                ? 'video/mp4'
                : null;
        case 'audio':
        case 'ptt':
            return asciiAt(buffer, 0, 'OggS') ? 'audio/ogg; codecs=opus' : null;
        case 'sticker':
            return asciiAt(buffer, 0, 'RIFF') && asciiAt(buffer, 8, 'WEBP') ? 'image/webp' : null;
    }
}
