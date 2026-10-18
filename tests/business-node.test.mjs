import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildInteractiveBizNode, groupStatusNodes, unwrapGroupStatus } from '../src/Utils/business-node.ts'

const attrs = { actual_actors: '2', host_storage: '2', privacy_mode_ts: '1' }
const flow = names => ({ interactiveMessage: { nativeFlowMessage: { buttons: names.map(name => ({ name })) } } })
const flowName = node => node.content[0].content[0].attrs

test('quick_reply e cta usam native_flow mixed com quality_control', () => {
	const node = buildInteractiveBizNode(flow(['quick_reply', 'cta_url']), attrs)
	assert.deepEqual(node.attrs, attrs)
	assert.deepEqual(flowName(node), { v: '9', name: 'mixed' })
	assert.equal(node.content[1].tag, 'quality_control')
})

test('form_message e catalog_message nomeiam o native_flow da stanza, não o atributo do biz', () => {
	for (const name of ['form_message', 'catalog_message']) {
		const node = buildInteractiveBizNode(flow([name]), attrs)
		assert.deepEqual(flowName(node), { name })
		assert.equal(node.attrs.native_flow_name, undefined)
	}
})

test('payment_info e review_and_pay seguem no atributo native_flow_name do biz', () => {
	assert.equal(buildInteractiveBizNode(flow(['payment_info']), attrs).attrs.native_flow_name, 'payment_info')
	assert.equal(buildInteractiveBizNode(flow(['review_and_pay']), attrs).attrs.native_flow_name, 'order_details')
	assert.equal(buildInteractiveBizNode(flow(['payment_info']), attrs).content, undefined)
})

test('carrossel gera biz mixed sem atributos nem quality_control (outro envelope vem com ack 473)', () => {
	const node = buildInteractiveBizNode({ interactiveMessage: { carouselMessage: { cards: [] } } }, attrs)
	assert.deepEqual(node.attrs, {})
	assert.equal(node.content.length, 1)
	assert.deepEqual(flowName(node), { v: '9', name: 'mixed' })
})

test('botões legados usam mixed; lista e texto ficam para o caminho antigo', () => {
	assert.deepEqual(flowName(buildInteractiveBizNode({ buttonsMessage: {} }, attrs)), { v: '9', name: 'mixed' })
	assert.equal(buildInteractiveBizNode({ listMessage: {} }, attrs), undefined)
	assert.equal(buildInteractiveBizNode({ conversation: 'oi' }, attrs), undefined)
})

test('status de grupo: desembrulha para type/mediatype e adiciona o meta uma vez', () => {
	const inner = { imageMessage: { caption: 'x' } }
	const status = { groupStatusMessageV2: { message: inner } }
	assert.equal(unwrapGroupStatus(status), inner)
	assert.equal(unwrapGroupStatus(inner), inner)
	assert.deepEqual(groupStatusNodes(status), [
		{ tag: 'meta', attrs: { is_group_status: 'true', origin: 'group_status' } }
	])
	assert.deepEqual(groupStatusNodes(inner), [])
	assert.deepEqual(groupStatusNodes(status, [{ tag: 'meta', attrs: { is_group_status: 'true' } }]), [])
})
