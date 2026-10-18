import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
	buildNewsletterMessagesIq,
	buildNewsletterQuestionResponsesIq,
	isNewsletterPageCount,
	isNewsletterServerId,
	parseNewsletterPosts,
	parseNewsletterQuestionResponses,
} from '../src/Utils/newsletter-messages.ts';

const { proto } = createRequire(import.meta.url)('../WAProto');
const decode = bytes => proto.Message.decode(bytes);

// a fixture guarda o proto como JSON; aqui vira bytes no <plaintext> (truncate corta os bytes para quebrar o decode)
const hydrate = node => {
	if (node.tag === 'plaintext') {
		const { proto: message, truncate } = node.content;
		const bytes = proto.Message.encode(proto.Message.fromObject(message)).finish();
		return { ...node, content: truncate ? bytes.slice(0, truncate) : bytes };
	}
	return Array.isArray(node.content) ? { ...node, content: node.content.map(hydrate) } : node;
};
const fixture = name =>
	hydrate(JSON.parse(readFileSync(new URL(`./fixtures/newsletter/${name}.json`, import.meta.url), 'utf-8')));

test('parseNewsletterPosts: pergunta, enquete, mídia e texto, com a ordem do servidor', () => {
	const { messages } = parseNewsletterPosts(fixture('posts'), 20, decode);
	assert.deepEqual(
		messages.map(m => [m.serverId, m.type, m.text]),
		[
			['108', 'question', 'pergunta ficticia'],
			['107', 'question', 'pergunta sem resposta'],
			['106', 'poll', 'enquete ficticia'],
			['105', 'video', 'legenda ficticia'],
			['104', 'ptt', null],
			['103', 'text', 'texto ficticio'],
			['102', 'text', 'conversa ficticia'],
			['101', 'text', null],
			['100', 'unknown', null],
		],
	);
	assert.equal(messages[0].messageId, '3EB0000000000000000000000000000000000108');
	assert.equal(messages[0].createdAt, '2026-10-07T18:52:49.000Z');
});

test('parseNewsletterPosts: contadores null quando o nó não veio; pergunta sem responses_count vira 0', () => {
	const { messages } = parseNewsletterPosts(fixture('posts'), 20, decode);
	const byId = Object.fromEntries(messages.map(m => [m.serverId, m]));
	assert.deepEqual(
		[byId[108].responsesCount, byId[108].viewsCount, byId[108].forwardsCount],
		[5, null, null],
	);
	assert.equal(byId[107].responsesCount, 0, 'pergunta sem nó: 0');
	assert.equal(byId[106].responsesCount, null, 'enquete sem nó: null, não 0');
	assert.deepEqual([byId[105].viewsCount, byId[105].forwardsCount], [42, 3]);
});

test('parseNewsletterPosts: plaintext truncado mantém o item com text null', () => {
	const { messages } = parseNewsletterPosts(fixture('posts'), 20, decode);
	const truncated = messages.find(m => m.serverId === '101');
	assert.equal(truncated.text, null);
	assert.equal(truncated.messageId, '3EB0000000000000000000000000000000000101');
	assert.throws(() => decode(fixture('posts').content.find(m => m.attrs.server_id === '101').content.find(c => c.tag === 'plaintext').content));
});

test('parseNewsletterPosts: página cheia, parcial e vazia', () => {
	const list = fixture('posts');
	const full = parseNewsletterPosts(list, 9, decode);
	assert.deepEqual([full.hasNextPage, full.nextBefore], [true, '100']);
	const partial = parseNewsletterPosts(list, 20, decode);
	assert.deepEqual([partial.hasNextPage, partial.nextBefore], [false, '100']);
	const empty = parseNewsletterPosts({ tag: 'messages', attrs: {} }, 20, decode);
	assert.deepEqual(empty, { messages: [], nextBefore: null, hasNextPage: false });
	assert.deepEqual(parseNewsletterPosts(undefined, 20, decode), empty, 'result sem <messages> também é página vazia');
});

test('parseNewsletterQuestionResponses: 3 respostas com texto, LID e nome, ids em string', () => {
	const page = parseNewsletterQuestionResponses(fixture('question-responses'), 10, decode);
	assert.deepEqual(page.responses[0], {
		responseServerId: '9007199254740993',
		messageId: 'A58B8E67E28CBBFC69B74204BC3191A3',
		text: 'resposta tres',
		createdAt: '2026-10-13T01:06:06.000Z',
		sender: { lid: '100000000000001@lid', name: 'Fulano Ficticio' },
	});
	assert.deepEqual(page.responses.map(r => r.text), ['resposta tres', null, 'resposta um']);
	assert.equal(page.responses[1].sender.name, null, 'sem notify_name');
});

test('parseNewsletterQuestionResponses: 9007199254740993 volta igual, sem arredondar para ...992', () => {
	const page = parseNewsletterQuestionResponses(fixture('question-responses'), 3, decode);
	assert.equal(page.responses[0].responseServerId, '9007199254740993');
	assert.equal(typeof page.responses[0].responseServerId, 'string');
	assert.equal(JSON.parse(JSON.stringify(page)).responses[0].responseServerId, '9007199254740993');
});

test('parseNewsletterQuestionResponses: plaintext truncado mantém a resposta com text null', () => {
	const page = parseNewsletterQuestionResponses(fixture('question-responses'), 3, decode);
	assert.equal(page.responses[1].text, null);
	assert.equal(page.responses[1].responseServerId, '9007199254740991');
});

test('parseNewsletterQuestionResponses: página cheia, parcial e vazia', () => {
	const list = fixture('question-responses');
	const full = parseNewsletterQuestionResponses(list, 3, decode);
	assert.deepEqual([full.hasNextPage, full.nextBefore], [true, '9007199254740990']);
	const partial = parseNewsletterQuestionResponses(list, 10, decode);
	assert.equal(partial.hasNextPage, false);
	const empty = parseNewsletterQuestionResponses({ tag: 'question_responses', attrs: {} }, 10, decode);
	assert.deepEqual(empty, { responses: [], nextBefore: null, hasNextPage: false });
	assert.deepEqual(parseNewsletterQuestionResponses(undefined, 10, decode), empty, 'result sem <question_responses> também é página vazia');
});

test('IQs: posts vão para s.whatsapp.net, respostas para o canal; before só quando informado', () => {
	const jid = '120363000000000001@newsletter';
	assert.deepEqual(buildNewsletterMessagesIq(jid, 20), {
		tag: 'iq',
		attrs: { type: 'get', to: '@s.whatsapp.net', xmlns: 'newsletter' },
		content: [{ tag: 'messages', attrs: { type: 'jid', jid, count: '20' } }],
	});
	assert.equal(buildNewsletterMessagesIq(jid, 20, '100').content[0].attrs.before, '100');
	const iq = buildNewsletterQuestionResponsesIq(jid, '108', 3, '9007199254740993');
	assert.equal(iq.attrs.to, jid);
	assert.deepEqual(iq.content[0], {
		tag: 'question_responses',
		attrs: { server_id: '108', count: '3', before: '9007199254740993' },
	});
	assert.equal('before' in buildNewsletterQuestionResponsesIq(jid, '108', 3).content[0].attrs, false);
});

test('validação: count de 1 a 100 inteiro; serverId só dígitos, sem zero à esquerda, até 19', () => {
	for (const ok of [1, 50, 100]) assert.equal(isNewsletterPageCount(ok), true);
	for (const bad of [0, 101, -1, 1.5, '10', NaN, undefined]) assert.equal(isNewsletterPageCount(bad), false);
	for (const ok of ['1', '108', '9007199254740993', '1234567890123456789']) assert.equal(isNewsletterServerId(ok), true);
	for (const bad of ['', '0', '012', '1e3', 'abc', '12345678901234567890', 108, ' 1', '1\n']) {
		assert.equal(isNewsletterServerId(bad), false, String(bad));
	}
});
