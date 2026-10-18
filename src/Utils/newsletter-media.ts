import { Boom } from '@hapi/boom';
import { execFile } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { proto } from '../../WAProto';
import { DEFAULT_ORIGIN, NEWSLETTER_MEDIA_PATH_MAP } from '../Defaults';
import { MediaConnInfo, SocketConfig } from '../Types';
import type { NewsletterMediaKind } from '../Types/Newsletter';
import type { ILogger } from './logger';
import { sniffNewsletterMimetype } from './image-mimetype';
import {
	extractImageThumb,
	generateThumbnail,
	getAudioDuration,
	uploadWithNodeHttp,
} from './messages-media';
import { buildNewsletterMediaMessage, NewsletterMediaFields, reduceNewsletterWaveform } from './newsletter-post';

const execFileAsync = promisify(execFile);

const DEFAULT_UPLOAD_BUDGET_MS = 60_000;
const PROBE_TIMEOUT_MS = 15_000;
// f32le mono a 1 kHz: 16 MiB ≈ 70 min, o que cabe no teto de áudio do canal
const WAVEFORM_MAX_BYTES = 16 * 1024 * 1024;

interface NewsletterUploadResult {
	url: string;
	direct_path: string;
	handle: string;
}

export interface PreparedNewsletterMedia {
	message: proto.IMessage;
	/** vai em `media_id` na stanza */
	mediaId: string;
}

const INVALID_MEDIA_MESSAGE: Record<NewsletterMediaKind, string> = {
	image: 'Imagem do canal precisa ser JPEG ou PNG',
	video: 'Vídeo do canal precisa ser MP4',
	gif: 'Vídeo do canal precisa ser MP4',
	audio: 'Áudio do canal precisa ser OGG/Opus',
	ptt: 'Áudio do canal precisa ser OGG/Opus',
	sticker: 'Figurinha do canal precisa ser WebP',
};

/** Mídia de canal vai pura, com o sha256 do arquivo como token (whatsmeow/zapo); `timeoutMs` é o orçamento total do upload */
export async function prepareNewsletterMedia(
	kind: NewsletterMediaKind,
	media: Buffer,
	{
		config,
		refreshMediaConn,
		caption,
		isAnimated,
		timeoutMs = DEFAULT_UPLOAD_BUDGET_MS,
	}: {
		config: SocketConfig;
		refreshMediaConn: (force: boolean) => Promise<MediaConnInfo>;
		caption?: string;
		isAnimated?: boolean;
		timeoutMs?: number;
	},
): Promise<PreparedNewsletterMedia> {
	const mimetype = sniffNewsletterMimetype(kind, media);
	if (!mimetype) {
		throw new Boom(INVALID_MEDIA_MESSAGE[kind], { statusCode: 400 });
	}

	const fileSha256 = createHash('sha256').update(media).digest();
	const token = fileSha256.toString('base64url');

	// o upload do Baileys lê de arquivo; ffmpeg, ffprobe e a waveform também
	const filePath = join(tmpdir(), `newsletter-${kind}-${randomBytes(8).toString('hex')}`);
	try {
		await fs.writeFile(filePath, media);
		const uploaded = await uploadNewsletterMedia(kind, filePath, token, mimetype, {
			config,
			refreshMediaConn,
			timeoutMs,
		});
		const metadata = await newsletterMediaMetadata(kind, media, filePath, config.logger);
		return {
			mediaId: uploaded.handle,
			message: buildNewsletterMediaMessage(kind, {
				url: uploaded.url,
				directPath: uploaded.direct_path,
				mimetype,
				fileSha256,
				fileLength: media.length,
				caption,
				...metadata,
				isAnimated: kind === 'sticker' ? isAnimated ?? media.includes('ANIM') : undefined,
			}),
		};
	} finally {
		// o arquivo é temporário: se não der para apagar, o SO limpa o tmpdir
		await fs.unlink(filePath).catch(() => undefined);
	}
}

// sem miniatura, duração ou waveform a mídia ainda aparece, só sem prévia ou sem barra: não derruba o post
async function newsletterMediaMetadata(
	kind: NewsletterMediaKind,
	media: Buffer,
	filePath: string,
	logger: ILogger,
): Promise<Partial<NewsletterMediaFields>> {
	const soft = <T>(work: Promise<T>, what: string) =>
		work.catch(err => {
			logger.warn({ trace: err?.stack }, `newsletter: sem ${what} para ${kind}`);
			return undefined;
		});

	switch (kind) {
		case 'image': {
			const thumb = await soft(extractImageThumb(media), 'miniatura');
			return { jpegThumbnail: thumb?.buffer, width: thumb?.original?.width, height: thumb?.original?.height };
		}
		case 'video':
		case 'gif': {
			const [thumb, probed] = await Promise.all([
				soft(generateThumbnail(filePath, 'video', { logger }), 'miniatura'),
				soft(probeMedia(filePath), 'dimensões e duração'),
			]);
			return {
				jpegThumbnail: thumb?.thumbnail ? Buffer.from(thumb.thumbnail, 'base64') : undefined,
				...probed,
			};
		}
		case 'audio':
		case 'ptt': {
			const duration = await soft(getAudioDuration(media), 'duração');
			const waveform = kind === 'ptt' ? await soft(newsletterWaveform(filePath), 'waveform') : undefined;
			return { seconds: duration ? Math.round(duration) : undefined, waveform };
		}
		case 'sticker': {
			const probed = await soft(probeMedia(filePath), 'dimensões');
			return { width: probed?.width, height: probed?.height };
		}
	}
}

// o getAudioWaveform decodifica a 48 kHz em Float32 sem teto: um áudio longo vira centenas de MB fora do heap
async function newsletterWaveform(filePath: string) {
	const { stdout } = await execFileAsync(
		'ffmpeg',
		['-v', 'error', '-i', filePath, '-ac', '1', '-ar', '1000', '-f', 'f32le', '-'],
		{ timeout: PROBE_TIMEOUT_MS, maxBuffer: WAVEFORM_MAX_BYTES, encoding: 'buffer' },
	);
	const usable = stdout.length - (stdout.length % 4);
	return reduceNewsletterWaveform(new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + usable)));
}

async function probeMedia(filePath: string) {
	const { stdout } = await execFileAsync(
		'ffprobe',
		['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', filePath],
		{ timeout: PROBE_TIMEOUT_MS },
	);
	const info = JSON.parse(stdout);
	const video = info.streams?.find((stream: { codec_type?: string }) => stream.codec_type === 'video');
	const duration = Number(info.format?.duration);
	return {
		width: video?.width || undefined,
		height: video?.height || undefined,
		seconds: Number.isFinite(duration) ? Math.round(duration) : undefined,
	};
}

async function uploadNewsletterMedia(
	kind: NewsletterMediaKind,
	filePath: string,
	token: string,
	mimetype: string,
	{
		config,
		refreshMediaConn,
		timeoutMs,
	}: { config: SocketConfig; refreshMediaConn: (force: boolean) => Promise<MediaConnInfo>; timeoutMs: number },
): Promise<NewsletterUploadResult> {
	const { customUploadHosts, fetchAgent, logger, options } = config;
	let mediaConn = await refreshMediaConn(false);
	const hosts = [...customUploadHosts, ...mediaConn.hosts];

	const customHeaders =
		options?.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)
			? (options.headers as Record<string, string>)
			: {};
	const headers = { ...customHeaders, 'Content-Type': mimetype, Origin: DEFAULT_ORIGIN };

	const deadline = Date.now() + timeoutMs;
	let lastError: Error | undefined;

	for (const { hostname } of hosts) {
		const remainingMs = deadline - Date.now();
		if (remainingMs <= 0) break;
		const url = `https://${hostname}${NEWSLETTER_MEDIA_PATH_MAP[kind]}/${token}?auth=${encodeURIComponent(
			mediaConn.auth,
		)}&token=${token}`;
		try {
			const result = await uploadWithNodeHttp(url, filePath, headers, fetchAgent, remainingMs);
			if (result?.url && result?.direct_path && result?.handle) {
				return result;
			}
			mediaConn = await refreshMediaConn(true);
			throw new Error(`upload sem url, direct_path ou handle: ${JSON.stringify(result)}`);
		} catch (err) {
			lastError = err;
			logger.warn({ trace: err?.stack }, `newsletter: falha no upload em ${hostname}`);
		}
	}

	throw new Boom('Media upload failed on all hosts', {
		statusCode: 500,
		data: { lastError: lastError?.message },
	});
}
