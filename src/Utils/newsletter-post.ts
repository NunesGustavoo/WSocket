import { Boom } from '@hapi/boom';
import type { proto } from '../../WAProto';
import type { NewsletterMediaKind, NewsletterPoll } from '../Types/Newsletter';
import type { BinaryNode } from '../WABinary';

/** Medido no WhatsApp real: o `mediatype` da stanza é o próprio kind */
export const NEWSLETTER_MEDIA_PATH_MAP = {
	image: '/newsletter/newsletter-image',
	video: '/newsletter/newsletter-video',
	gif: '/newsletter/newsletter-gif',
	audio: '/newsletter/newsletter-audio',
	ptt: '/newsletter/newsletter-ptt',
	sticker: '/newsletter/newsletter-sticker',
} as const;

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
export function buildNewsletterMediaMessage(kind: NewsletterMediaKind, f: NewsletterMediaFields): proto.IMessage {
	const base = {
		url: f.url,
		directPath: f.directPath,
		mimetype: f.mimetype,
		fileSha256: f.fileSha256,
		fileLength: f.fileLength,
	};
	switch (kind) {
		case 'image':
			return {
				imageMessage: {
					...base,
					caption: f.caption || undefined,
					jpegThumbnail: f.jpegThumbnail,
					width: f.width,
					height: f.height,
				},
			};
		case 'video':
		case 'gif':
			return {
				videoMessage: {
					...base,
					caption: f.caption || undefined,
					jpegThumbnail: f.jpegThumbnail,
					width: f.width,
					height: f.height,
					seconds: f.seconds,
					gifPlayback: kind === 'gif' || undefined,
				},
			};
		case 'audio':
		case 'ptt':
			return {
				audioMessage: {
					...base,
					seconds: f.seconds,
					ptt: kind === 'ptt' || undefined,
					waveform: kind === 'ptt' ? f.waveform : undefined,
				},
			};
		case 'sticker':
			return { stickerMessage: { ...base, isAnimated: !!f.isAnimated, width: f.width, height: f.height } };
	}
}

/** 64 médias de amplitude, a maior vira 100, como o `getAudioWaveform`; silêncio e áudio curto não geram NaN */
export function reduceNewsletterWaveform(samples: Float32Array, blocks = 64): Uint8Array {
	const averages: number[] = [];
	for (let i = 0; i < blocks; i++) {
		const start = Math.floor((i * samples.length) / blocks);
		const end = Math.floor(((i + 1) * samples.length) / blocks);
		let sum = 0;
		for (let j = start; j < end; j++) sum += Math.abs(samples[j]);
		averages.push(end > start ? sum / (end - start) : 0);
	}
	const max = Math.max(...averages);
	return new Uint8Array(averages.map(avg => (max > 0 && Number.isFinite(max) ? Math.floor((100 * avg) / max) : 0)));
}

/** Escolha única vai em V3 e múltipla em V1, como medido em canal; sem `endDate` (não medido) */
export function buildNewsletterPollMessage(poll: NewsletterPoll, messageSecret: Uint8Array): proto.IMessage {
	const single = poll.selectableCount === 1;
	const creation = {
		name: poll.name,
		options: poll.values.map(optionName => ({ optionName })),
		selectableOptionsCount: single ? 1 : 0,
	};
	return {
		messageContextInfo: { messageSecret },
		...(single ? { pollCreationMessageV3: creation } : { pollCreationMessage: creation }),
	};
}

/** Pergunta de canal é texto ou imagem; `conversation` não tem `contextInfo`, então o texto vira `extendedTextMessage` (medido) */
export function buildNewsletterQuestionMessage(inner: proto.IMessage): proto.IMessage {
	const contextInfo = { isQuestion: true };
	if (typeof inner.conversation === 'string') {
		return { questionMessage: { message: { extendedTextMessage: { text: inner.conversation, contextInfo } } } };
	}
	if (inner.imageMessage) {
		return {
			questionMessage: {
				message: { imageMessage: { ...inner.imageMessage, contextInfo: { ...inner.imageMessage.contextInfo, ...contextInfo } } },
			},
		};
	}
	throw new Boom('Pergunta de canal só aceita texto ou imagem', { statusCode: 400 });
}

/** Stanza de post em canal no formato whatsmeow/zapo: `<plaintext>` sem Signal, com `mediatype` e `media_id` na mídia */
export function buildNewsletterPostStanza(params: {
	to: string;
	id: string;
	encodedMessage: Uint8Array;
	media?: { mediatype: NewsletterMediaKind; mediaId: string };
	poll?: boolean;
	question?: boolean;
}): BinaryNode {
	const { to, id, encodedMessage, media, poll, question } = params;
	const plaintext: BinaryNode = {
		tag: 'plaintext',
		attrs: media ? { mediatype: media.mediatype } : {},
		content: Buffer.from(encodedMessage),
	};
	if (poll) {
		return {
			tag: 'message',
			attrs: { to, id, type: 'poll' },
			content: [plaintext, { tag: 'meta', attrs: { polltype: 'creation' } }],
		};
	}
	return {
		tag: 'message',
		attrs: { to, id, type: media ? 'media' : 'text', ...(media ? { media_id: media.mediaId } : {}) },
		content: question ? [plaintext, { tag: 'meta', attrs: { questiontype: 'question' } }] : [plaintext],
	};
}
