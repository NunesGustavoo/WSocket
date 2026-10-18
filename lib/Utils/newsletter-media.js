"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareNewsletterMedia = prepareNewsletterMedia;
const boom_1 = require("@hapi/boom");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const util_1 = require("util");
const Defaults_1 = require("../Defaults");
const image_mimetype_1 = require("./image-mimetype");
const messages_media_1 = require("./messages-media");
const newsletter_post_1 = require("./newsletter-post");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const DEFAULT_UPLOAD_BUDGET_MS = 60000;
const PROBE_TIMEOUT_MS = 15000;
// f32le mono a 1 kHz: 16 MiB ≈ 70 min, o que cabe no teto de áudio do canal
const WAVEFORM_MAX_BYTES = 16 * 1024 * 1024;
const INVALID_MEDIA_MESSAGE = {
    image: 'Imagem do canal precisa ser JPEG ou PNG',
    video: 'Vídeo do canal precisa ser MP4',
    gif: 'Vídeo do canal precisa ser MP4',
    audio: 'Áudio do canal precisa ser OGG/Opus',
    ptt: 'Áudio do canal precisa ser OGG/Opus',
    sticker: 'Figurinha do canal precisa ser WebP',
};
/** Mídia de canal vai pura, com o sha256 do arquivo como token (whatsmeow/zapo); `timeoutMs` é o orçamento total do upload */
async function prepareNewsletterMedia(kind, media, { config, refreshMediaConn, caption, isAnimated, timeoutMs = DEFAULT_UPLOAD_BUDGET_MS, }) {
    const mimetype = (0, image_mimetype_1.sniffNewsletterMimetype)(kind, media);
    if (!mimetype) {
        throw new boom_1.Boom(INVALID_MEDIA_MESSAGE[kind], { statusCode: 400 });
    }
    const fileSha256 = (0, crypto_1.createHash)('sha256').update(media).digest();
    const token = fileSha256.toString('base64url');
    // o upload do Baileys lê de arquivo; ffmpeg, ffprobe e a waveform também
    const filePath = (0, path_1.join)((0, os_1.tmpdir)(), `newsletter-${kind}-${(0, crypto_1.randomBytes)(8).toString('hex')}`);
    try {
        await fs_1.promises.writeFile(filePath, media);
        const uploaded = await uploadNewsletterMedia(kind, filePath, token, mimetype, {
            config,
            refreshMediaConn,
            timeoutMs,
        });
        const metadata = await newsletterMediaMetadata(kind, media, filePath, config.logger);
        return {
            mediaId: uploaded.handle,
            message: (0, newsletter_post_1.buildNewsletterMediaMessage)(kind, {
                url: uploaded.url,
                directPath: uploaded.direct_path,
                mimetype,
                fileSha256,
                fileLength: media.length,
                caption,
                ...metadata,
                isAnimated: kind === 'sticker' ? isAnimated !== null && isAnimated !== void 0 ? isAnimated : media.includes('ANIM') : undefined,
            }),
        };
    }
    finally {
        // o arquivo é temporário: se não der para apagar, o SO limpa o tmpdir
        await fs_1.promises.unlink(filePath).catch(() => undefined);
    }
}
// sem miniatura, duração ou waveform a mídia ainda aparece, só sem prévia ou sem barra: não derruba o post
async function newsletterMediaMetadata(kind, media, filePath, logger) {
    var _a, _b;
    const soft = (work, what) => work.catch(err => {
        logger.warn({ trace: err === null || err === void 0 ? void 0 : err.stack }, `newsletter: sem ${what} para ${kind}`);
        return undefined;
    });
    switch (kind) {
        case 'image': {
            const thumb = await soft((0, messages_media_1.extractImageThumb)(media), 'miniatura');
            return { jpegThumbnail: thumb === null || thumb === void 0 ? void 0 : thumb.buffer, width: (_a = thumb === null || thumb === void 0 ? void 0 : thumb.original) === null || _a === void 0 ? void 0 : _a.width, height: (_b = thumb === null || thumb === void 0 ? void 0 : thumb.original) === null || _b === void 0 ? void 0 : _b.height };
        }
        case 'video':
        case 'gif': {
            const [thumb, probed] = await Promise.all([
                soft((0, messages_media_1.generateThumbnail)(filePath, 'video', { logger }), 'miniatura'),
                soft(probeMedia(filePath), 'dimensões e duração'),
            ]);
            return {
                jpegThumbnail: (thumb === null || thumb === void 0 ? void 0 : thumb.thumbnail) ? Buffer.from(thumb.thumbnail, 'base64') : undefined,
                ...probed,
            };
        }
        case 'audio':
        case 'ptt': {
            const duration = await soft((0, messages_media_1.getAudioDuration)(media), 'duração');
            const waveform = kind === 'ptt' ? await soft(newsletterWaveform(filePath), 'waveform') : undefined;
            return { seconds: duration ? Math.round(duration) : undefined, waveform };
        }
        case 'sticker': {
            const probed = await soft(probeMedia(filePath), 'dimensões');
            return { width: probed === null || probed === void 0 ? void 0 : probed.width, height: probed === null || probed === void 0 ? void 0 : probed.height };
        }
    }
}
// o getAudioWaveform decodifica a 48 kHz em Float32 sem teto: um áudio longo vira centenas de MB fora do heap
async function newsletterWaveform(filePath) {
    const { stdout } = await execFileAsync('ffmpeg', ['-v', 'error', '-i', filePath, '-ac', '1', '-ar', '1000', '-f', 'f32le', '-'], { timeout: PROBE_TIMEOUT_MS, maxBuffer: WAVEFORM_MAX_BYTES, encoding: 'buffer' });
    const usable = stdout.length - (stdout.length % 4);
    return (0, newsletter_post_1.reduceNewsletterWaveform)(new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + usable)));
}
async function probeMedia(filePath) {
    var _a, _b;
    const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', filePath], { timeout: PROBE_TIMEOUT_MS });
    const info = JSON.parse(stdout);
    const video = (_a = info.streams) === null || _a === void 0 ? void 0 : _a.find((stream) => stream.codec_type === 'video');
    const duration = Number((_b = info.format) === null || _b === void 0 ? void 0 : _b.duration);
    return {
        width: (video === null || video === void 0 ? void 0 : video.width) || undefined,
        height: (video === null || video === void 0 ? void 0 : video.height) || undefined,
        seconds: Number.isFinite(duration) ? Math.round(duration) : undefined,
    };
}
async function uploadNewsletterMedia(kind, filePath, token, mimetype, { config, refreshMediaConn, timeoutMs, }) {
    const { customUploadHosts, fetchAgent, logger, options } = config;
    let mediaConn = await refreshMediaConn(false);
    const hosts = [...customUploadHosts, ...mediaConn.hosts];
    const customHeaders = (options === null || options === void 0 ? void 0 : options.headers) && typeof options.headers === 'object' && !Array.isArray(options.headers)
        ? options.headers
        : {};
    const headers = { ...customHeaders, 'Content-Type': mimetype, Origin: Defaults_1.DEFAULT_ORIGIN };
    const deadline = Date.now() + timeoutMs;
    let lastError;
    for (const { hostname } of hosts) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0)
            break;
        const url = `https://${hostname}${Defaults_1.NEWSLETTER_MEDIA_PATH_MAP[kind]}/${token}?auth=${encodeURIComponent(mediaConn.auth)}&token=${token}`;
        try {
            const result = await (0, messages_media_1.uploadWithNodeHttp)(url, filePath, headers, fetchAgent, remainingMs);
            if ((result === null || result === void 0 ? void 0 : result.url) && (result === null || result === void 0 ? void 0 : result.direct_path) && (result === null || result === void 0 ? void 0 : result.handle)) {
                return result;
            }
            mediaConn = await refreshMediaConn(true);
            throw new Error(`upload sem url, direct_path ou handle: ${JSON.stringify(result)}`);
        }
        catch (err) {
            lastError = err;
            logger.warn({ trace: err === null || err === void 0 ? void 0 : err.stack }, `newsletter: falha no upload em ${hostname}`);
        }
    }
    throw new boom_1.Boom('Media upload failed on all hosts', {
        statusCode: 500,
        data: { lastError: lastError === null || lastError === void 0 ? void 0 : lastError.message },
    });
}
