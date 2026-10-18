import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAdminInviteExpiration, parseNewsletterMetadata } from '../src/Utils/newsletter-metadata.ts';
import { buildNewsletterPostStanza } from '../src/Utils/newsletter-post.ts';
import { sniffImageMimetype } from '../src/Utils/image-mimetype.ts';

const fixture = name =>
	JSON.parse(readFileSync(new URL(`./fixtures/newsletter/${name}.json`, import.meta.url), 'utf-8')).data;

test('parseNewsletterMetadata: metadata lido por JID traz tudo que o Channel precisa', () => {
	const metadata = parseNewsletterMetadata(fixture('metadata').xwa2_newsletter);
	assert.deepEqual(metadata, {
		id: '120363000000000001@newsletter',
		name: 'Canal Ficticio',
		description: 'Descricao ficticia',
		inviteCode: '0029VaFicticio00000001',
		pictureDirectPath: '/m1/v/t24/FICTICIO?stp=dst-jpg&oe=00000000',
		role: 'OWNER',
		subscribersCount: 1,
		state: 'ACTIVE',
		verified: false,
		creationTime: 1791237479,
	});
});

test('parseNewsletterMetadata: listagem só traz preview, que vira pictureDirectPath', () => {
	const [item] = fixture('list').xwa2_newsletter_subscribed;
	assert.equal(item.thread_metadata.picture, null, 'a fixture é a listagem real: sem picture');
	const metadata = parseNewsletterMetadata(item);
	assert.equal(metadata.role, 'ADMIN');
	assert.equal(metadata.pictureDirectPath, item.thread_metadata.preview.direct_path);
	assert.ok(metadata.pictureDirectPath);
	assert.equal(metadata.subscribersCount, null);
});

test('parseNewsletterMetadata: picture ganha do preview quando os dois vêm', () => {
	const raw = structuredClone(fixture('metadata').xwa2_newsletter);
	raw.thread_metadata.preview.direct_path = '/m1/v/t24/PREVIEW';
	assert.equal(parseNewsletterMetadata(raw).pictureDirectPath, raw.thread_metadata.picture.direct_path);
});

test('parseNewsletterMetadata: consulta por convite tem role null e preview vazio vira null', () => {
	const metadata = parseNewsletterMetadata(fixture('metadata-invite').xwa2_newsletter);
	assert.equal(metadata.role, null, 'viewer_metadata vem null');
	assert.equal(metadata.pictureDirectPath, null, 'direct_path "" não é URL');
	assert.equal(metadata.subscribersCount, 0, 'zero é número, não ausência');
});

test('parseNewsletterMetadata: create devolve o dono, contagem zero e sem foto', () => {
	const metadata = parseNewsletterMetadata(fixture('create').xwa2_newsletter_create);
	assert.equal(metadata.role, 'OWNER');
	assert.equal(metadata.subscribersCount, 0);
	assert.equal(metadata.pictureDirectPath, null);
});

test('parseNewsletterMetadata: update não traz role nem contagem, mas traz a foto nova', () => {
	const metadata = parseNewsletterMetadata(fixture('update').xwa2_newsletter_update);
	assert.equal(metadata.role, null);
	assert.equal(metadata.subscribersCount, null);
	assert.ok(metadata.pictureDirectPath);
});

test('parseNewsletterMetadata: NON_EXISTING vira null, em metadata e em update', () => {
	assert.equal(parseNewsletterMetadata(fixture('non-existing-fetch').xwa2_newsletter), null);
	assert.equal(parseNewsletterMetadata(fixture('non-existing-update').xwa2_newsletter_update), null);
});

test('parseNewsletterMetadata: DELETED vira null', () => {
	assert.equal(parseNewsletterMetadata(fixture('delete').xwa2_newsletter_delete_v2), null);
});

test('parseNewsletterMetadata: verificado e estado suspenso', () => {
	const raw = structuredClone(fixture('metadata').xwa2_newsletter);
	raw.thread_metadata.verification = 'VERIFIED';
	raw.state.type = 'SUSPENDED';
	const metadata = parseNewsletterMetadata(raw);
	assert.equal(metadata.verified, true);
	assert.equal(metadata.state, 'SUSPENDED');
});

test('parseNewsletterMetadata: canal ativo sem thread_metadata é erro, não sucesso vazio', () => {
	const raw = structuredClone(fixture('metadata').xwa2_newsletter);
	raw.thread_metadata = null;
	assert.throws(() => parseNewsletterMetadata(raw), /thread_metadata/);
});

test('parseNewsletterMetadata: lenient aceita item de listagem sem thread_metadata', () => {
	const metadata = parseNewsletterMetadata(
		{ id: '120363000000000009@newsletter', state: { type: 'GEOSUSPENDED' }, thread_metadata: null },
		{ lenient: true },
	);
	assert.equal(metadata.id, '120363000000000009@newsletter');
	assert.equal(metadata.state, 'GEOSUSPENDED');
	assert.equal(metadata.name, '');
	assert.equal(metadata.pictureDirectPath, null);
});

test('parseNewsletterMetadata: campos numéricos ilegíveis viram null', () => {
	const raw = structuredClone(fixture('metadata').xwa2_newsletter);
	raw.thread_metadata.subscribers_count = 'abc';
	raw.thread_metadata.creation_time = '';
	const metadata = parseNewsletterMetadata(raw);
	assert.equal(metadata.subscribersCount, null);
	assert.equal(metadata.creationTime, null);
});

test('parseAdminInviteExpiration: segundos viram ms', () => {
	assert.equal(parseAdminInviteExpiration(fixture('admin-invite-create').xwa2_newsletter_admin_invite_create), 1791842490000);
});

test('parseAdminInviteExpiration: ausente, zero ou ilegível vira null', () => {
	assert.equal(parseAdminInviteExpiration({}), null);
	assert.equal(parseAdminInviteExpiration({ invite_expiration_time: null }), null);
	assert.equal(parseAdminInviteExpiration({ invite_expiration_time: '0' }), null);
	assert.equal(parseAdminInviteExpiration({ invite_expiration_time: 'x' }), null);
});

test('sniffImageMimetype: JPEG e PNG pelos magic bytes', () => {
	assert.equal(sniffImageMimetype(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0])), 'image/jpeg');
	assert.equal(sniffImageMimetype(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
});

test('sniffImageMimetype: WebP, GIF, buffer curto e vazio não passam', () => {
	assert.equal(sniffImageMimetype(Buffer.from('RIFF0000WEBP')), null);
	assert.equal(sniffImageMimetype(Buffer.from('GIF89a')), null);
	assert.equal(sniffImageMimetype(Buffer.from([0xff, 0xd8])), null, 'JPEG precisa de 3 bytes');
	assert.equal(sniffImageMimetype(Buffer.alloc(0)), null);
});

test('buildNewsletterPostStanza: texto vai type=text, sem media_id nem mediatype', () => {
	const stanza = buildNewsletterPostStanza({ to: '120363000000000001@newsletter', id: 'ID1', encodedMessage: new Uint8Array([1, 2]) });
	assert.deepEqual(stanza.attrs, { to: '120363000000000001@newsletter', id: 'ID1', type: 'text' });
	assert.equal(stanza.content[0].tag, 'plaintext');
	assert.deepEqual(stanza.content[0].attrs, {});
	assert.deepEqual([...stanza.content[0].content], [1, 2]);
});

test('buildNewsletterPostStanza: imagem vai type=media com media_id na stanza e mediatype no plaintext', () => {
	const stanza = buildNewsletterPostStanza({
		to: '120363000000000001@newsletter',
		id: 'ID2',
		encodedMessage: new Uint8Array([3]),
		media: { mediatype: 'image', mediaId: 'wa_channel_image/flat/ABC' },
	});
	assert.deepEqual(stanza.attrs, {
		to: '120363000000000001@newsletter',
		id: 'ID2',
		type: 'media',
		media_id: 'wa_channel_image/flat/ABC',
	});
	assert.deepEqual(stanza.content[0].attrs, { mediatype: 'image' });
});
