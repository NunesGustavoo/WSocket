import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildNewsletterMediaMessage,
	buildNewsletterPollMessage,
	buildNewsletterPostStanza,
	buildNewsletterQuestionMessage,
	NEWSLETTER_MEDIA_PATH_MAP,
	reduceNewsletterWaveform,
} from '../src/Utils/newsletter-post.ts';
import { sniffNewsletterMimetype } from '../src/Utils/image-mimetype.ts';

const fields = {
	url: 'https://mmg.whatsapp.net/m1/x',
	directPath: '/m1/x',
	mimetype: 'm',
	fileSha256: new Uint8Array([9]),
	fileLength: 10,
	caption: 'legenda',
	jpegThumbnail: new Uint8Array([1]),
	width: 640,
	height: 360,
	seconds: 5,
	waveform: new Uint8Array([50]),
	isAnimated: true,
};

test('NEWSLETTER_MEDIA_PATH_MAP: path medido por kind, gif e ptt com path próprio', () => {
	assert.deepEqual(NEWSLETTER_MEDIA_PATH_MAP, {
		image: '/newsletter/newsletter-image',
		video: '/newsletter/newsletter-video',
		gif: '/newsletter/newsletter-gif',
		audio: '/newsletter/newsletter-audio',
		ptt: '/newsletter/newsletter-ptt',
		sticker: '/newsletter/newsletter-sticker',
	});
});

test('buildNewsletterMediaMessage: campo do proto por kind, sem mediaKey nem fileEncSha256', () => {
	const expected = {
		image: 'imageMessage',
		video: 'videoMessage',
		gif: 'videoMessage',
		audio: 'audioMessage',
		ptt: 'audioMessage',
		sticker: 'stickerMessage',
	};
	for (const [kind, field] of Object.entries(expected)) {
		const message = buildNewsletterMediaMessage(kind, fields);
		assert.deepEqual(Object.keys(message), [field], kind);
		const inner = message[field];
		assert.equal(inner.mediaKey, undefined, kind);
		assert.equal(inner.fileEncSha256, undefined, kind);
		assert.equal(inner.directPath, '/m1/x', kind);
		assert.equal(inner.fileLength, 10, kind);
	}
});

test('buildNewsletterMediaMessage: gif liga gifPlayback e vídeo não', () => {
	assert.equal(buildNewsletterMediaMessage('gif', fields).videoMessage.gifPlayback, true);
	assert.equal(buildNewsletterMediaMessage('video', fields).videoMessage.gifPlayback, undefined);
	const video = buildNewsletterMediaMessage('video', fields).videoMessage;
	assert.deepEqual([video.caption, video.width, video.height, video.seconds], ['legenda', 640, 360, 5]);
});

test('buildNewsletterMediaMessage: ptt leva ptt e waveform; áudio não leva nenhum', () => {
	const ptt = buildNewsletterMediaMessage('ptt', fields).audioMessage;
	assert.equal(ptt.ptt, true);
	assert.deepEqual(ptt.waveform, new Uint8Array([50]));
	assert.equal(ptt.seconds, 5);
	const audio = buildNewsletterMediaMessage('audio', fields).audioMessage;
	assert.equal(audio.ptt, undefined);
	assert.equal(audio.waveform, undefined);
	assert.equal(audio.caption, undefined, 'áudio não tem legenda');
});

test('buildNewsletterMediaMessage: figurinha leva isAnimated e dimensões, sem legenda', () => {
	const sticker = buildNewsletterMediaMessage('sticker', fields).stickerMessage;
	assert.deepEqual([sticker.isAnimated, sticker.width, sticker.height, sticker.caption], [true, 640, 360, undefined]);
	assert.equal(buildNewsletterMediaMessage('sticker', { ...fields, isAnimated: undefined }).stickerMessage.isAnimated, false);
});

test('buildNewsletterPollMessage: escolha única vai em V3 com 1, múltipla em V1 com 0', () => {
	const secret = new Uint8Array(32).fill(7);
	const single = buildNewsletterPollMessage({ name: 'P?', values: ['a', 'b'], selectableCount: 1 }, secret);
	assert.deepEqual(single, {
		messageContextInfo: { messageSecret: secret },
		pollCreationMessageV3: { name: 'P?', options: [{ optionName: 'a' }, { optionName: 'b' }], selectableOptionsCount: 1 },
	});
	const multi = buildNewsletterPollMessage({ name: 'P?', values: ['a', 'b'], selectableCount: 0 }, secret);
	assert.equal(multi.pollCreationMessageV3, undefined);
	assert.equal(multi.pollCreationMessage.selectableOptionsCount, 0);
	assert.equal(multi.messageContextInfo.messageSecret, secret);
});

test('buildNewsletterPostStanza: enquete vai type=poll, sem media_id nem mediatype, com meta polltype=creation', () => {
	const stanza = buildNewsletterPostStanza({
		to: '120363000000000001@newsletter',
		id: 'ID3',
		encodedMessage: new Uint8Array([1]),
		poll: true,
	});
	assert.deepEqual(stanza.attrs, { to: '120363000000000001@newsletter', id: 'ID3', type: 'poll' });
	assert.equal(stanza.content.length, 2);
	assert.equal(stanza.content[0].tag, 'plaintext');
	assert.deepEqual(stanza.content[0].attrs, {});
	assert.deepEqual(stanza.content[1], { tag: 'meta', attrs: { polltype: 'creation' } });
});

test('buildNewsletterPostStanza: gif e ptt vão type=media com media_id e o próprio kind em mediatype', () => {
	for (const mediatype of ['video', 'gif', 'audio', 'ptt', 'sticker']) {
		const stanza = buildNewsletterPostStanza({
			to: '120363000000000001@newsletter',
			id: 'ID4',
			encodedMessage: new Uint8Array([1]),
			media: { mediatype, mediaId: 'wa_channel/h' },
		});
		assert.equal(stanza.attrs.type, 'media', mediatype);
		assert.equal(stanza.attrs.media_id, 'wa_channel/h', mediatype);
		assert.deepEqual(stanza.content[0].attrs, { mediatype }, mediatype);
		assert.equal(stanza.content.length, 1, mediatype);
	}
});

test('buildNewsletterQuestionMessage: conversation vira extendedTextMessage com isQuestion', () => {
	const message = buildNewsletterQuestionMessage({ conversation: 'Qual o melhor dia?' });
	assert.deepEqual(message, {
		questionMessage: {
			message: { extendedTextMessage: { text: 'Qual o melhor dia?', contextInfo: { isQuestion: true } } },
		},
	});
	assert.equal(message.questionMessage.message.conversation, undefined, 'conversation não carrega contextInfo');
	assert.equal(message.messageContextInfo, undefined, 'sem messageSecret, ao contrário da enquete');
});

test('buildNewsletterQuestionMessage: imagem ganha isQuestion e mantém caption, miniatura e demais campos', () => {
	const image = buildNewsletterMediaMessage('image', fields);
	const { imageMessage } = buildNewsletterQuestionMessage(image).questionMessage.message;
	assert.deepEqual(imageMessage.contextInfo, { isQuestion: true });
	assert.equal(imageMessage.caption, 'legenda');
	assert.deepEqual(imageMessage.jpegThumbnail, new Uint8Array([1]));
	assert.deepEqual([imageMessage.directPath, imageMessage.fileLength, imageMessage.width], ['/m1/x', 10, 640]);
	assert.equal(image.imageMessage.contextInfo, undefined, 'não muta a mensagem original');
});

test('buildNewsletterQuestionMessage: vídeo, áudio, figurinha e enquete lançam Boom 400', () => {
	const inners = [
		...['video', 'gif', 'audio', 'ptt', 'sticker'].map(kind => buildNewsletterMediaMessage(kind, fields)),
		buildNewsletterPollMessage({ name: 'P?', values: ['a', 'b'], selectableCount: 1 }, new Uint8Array(32)),
		{},
	];
	for (const inner of inners) {
		assert.throws(() => buildNewsletterQuestionMessage(inner), err => err.isBoom && err.output.statusCode === 400, Object.keys(inner).join());
	}
});

test('buildNewsletterPostStanza: pergunta de texto leva meta questiontype depois do plaintext', () => {
	const stanza = buildNewsletterPostStanza({
		to: '120363000000000001@newsletter',
		id: 'ID5',
		encodedMessage: new Uint8Array([1]),
		question: true,
	});
	assert.deepEqual(stanza.attrs, { to: '120363000000000001@newsletter', id: 'ID5', type: 'text' });
	assert.deepEqual(stanza.content.map(n => n.tag), ['plaintext', 'meta']);
	assert.deepEqual(stanza.content[0].attrs, {});
	assert.deepEqual(stanza.content[1], { tag: 'meta', attrs: { questiontype: 'question' } });
});

test('buildNewsletterPostStanza: pergunta de imagem mantém media_id e mediatype e acrescenta o meta', () => {
	const stanza = buildNewsletterPostStanza({
		to: '120363000000000001@newsletter',
		id: 'ID6',
		encodedMessage: new Uint8Array([1]),
		media: { mediatype: 'image', mediaId: 'wa_channel_image/flat/h' },
		question: true,
	});
	assert.deepEqual(stanza.attrs, {
		to: '120363000000000001@newsletter',
		id: 'ID6',
		type: 'media',
		media_id: 'wa_channel_image/flat/h',
	});
	assert.deepEqual(stanza.content[0].attrs, { mediatype: 'image' });
	assert.deepEqual(stanza.content.map(n => n.tag), ['plaintext', 'meta']);
	assert.deepEqual(stanza.content[1].attrs, { questiontype: 'question' });
});

test('buildNewsletterPostStanza: sem question, texto e imagem saem só com plaintext (regressão)', () => {
	const text = buildNewsletterPostStanza({ to: 'c@newsletter', id: 'ID7', encodedMessage: new Uint8Array([1]) });
	assert.equal(text.content.length, 1);
	assert.equal(text.attrs.type, 'text');
	const image = buildNewsletterPostStanza({
		to: 'c@newsletter',
		id: 'ID8',
		encodedMessage: new Uint8Array([1]),
		media: { mediatype: 'image', mediaId: 'm' },
		question: false,
	});
	assert.equal(image.content.length, 1);
	assert.equal(image.attrs.type, 'media');
});

const bytes = text => new Uint8Array([...text].map(ch => ch.charCodeAt(0)));

test('sniffNewsletterMimetype: MP4, OGG e WebP pelos magic bytes', () => {
	assert.equal(sniffNewsletterMimetype('video', bytes('\0\0\0\x18ftypmp42')), 'video/mp4');
	assert.equal(sniffNewsletterMimetype('gif', bytes('\0\0\0\x18ftypisom')), 'video/mp4');
	assert.equal(sniffNewsletterMimetype('audio', bytes('OggS\0\x02')), 'audio/ogg; codecs=opus');
	assert.equal(sniffNewsletterMimetype('ptt', bytes('OggS\0\x02')), 'audio/ogg; codecs=opus');
	assert.equal(sniffNewsletterMimetype('sticker', bytes('RIFF\x10\0\0\0WEBPVP8X')), 'image/webp');
	assert.equal(sniffNewsletterMimetype('image', new Uint8Array([0xff, 0xd8, 0xff])), 'image/jpeg');
});

test('sniffNewsletterMimetype: MP3, PNG como figurinha, RIFF que não é WebP e buffer curto não passam', () => {
	assert.equal(sniffNewsletterMimetype('audio', bytes('ID3\x04\0')), null, 'MP3 não aparece no app');
	assert.equal(sniffNewsletterMimetype('sticker', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), null);
	assert.equal(sniffNewsletterMimetype('sticker', bytes('RIFF\x10\0\0\0WAVEfmt ')), null);
	assert.equal(sniffNewsletterMimetype('video', bytes('\0\0\0\x18ft')), null);
	assert.equal(sniffNewsletterMimetype('video', bytes('OggS\0\0\0\0')), null);
});

test('sniffNewsletterMimetype: ftyp de imagem, M4A e QuickTime não passam como vídeo; marcas de MP4 passam', () => {
	for (const brand of ['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1', 'M4A ', 'M4B ', 'qt  ']) {
		assert.equal(sniffNewsletterMimetype('video', bytes(`\0\0\0\x18ftyp${brand}`)), null, brand);
		assert.equal(sniffNewsletterMimetype('gif', bytes(`\0\0\0\x18ftyp${brand}`)), null, brand);
	}
	for (const brand of ['isom', 'mp42', 'iso2', 'avc1', 'M4V ']) {
		assert.equal(sniffNewsletterMimetype('video', bytes(`\0\0\0\x18ftyp${brand}`)), 'video/mp4', brand);
	}
});

test('reduceNewsletterWaveform: sinal constante vira 64 barras em 100, sinal negativo conta pelo módulo', () => {
	assert.deepEqual([...reduceNewsletterWaveform(new Float32Array(6400).fill(-0.3))], new Array(64).fill(100));
});

test('reduceNewsletterWaveform: silêncio e áudio vazio viram zeros, sem NaN', () => {
	assert.deepEqual([...reduceNewsletterWaveform(new Float32Array(1000))], new Array(64).fill(0));
	assert.deepEqual([...reduceNewsletterWaveform(new Float32Array(0))], new Array(64).fill(0));
});

test('reduceNewsletterWaveform: menos de 64 amostras ainda dá 64 valores finitos, o maior em 100', () => {
	const wave = reduceNewsletterWaveform(new Float32Array([0.5, 1, 0.25]));
	assert.equal(wave.length, 64);
	assert.ok([...wave].every(v => v >= 0 && v <= 100));
	assert.equal(Math.max(...wave), 100);
	assert.ok(wave.includes(50) && wave.includes(25));
});

test('reduceNewsletterWaveform: proporção entre metades preservada', () => {
	const samples = new Float32Array(1280);
	samples.fill(0.2, 0, 640);
	samples.fill(0.8, 640);
	const wave = reduceNewsletterWaveform(samples);
	assert.equal(wave[0], 25);
	assert.equal(wave[63], 100);
});
