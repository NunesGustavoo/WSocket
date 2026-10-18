import type { proto } from '../../WAProto'
import type { BinaryNode, BinaryNodeAttributes } from '../WABinary'

// Formatos conferidos no Android e no WhatsApp Web em jobasfernandes/zapo-interactive-examples (docs/delivery-matrix.md)

const flowNode = (attrs: BinaryNodeAttributes): BinaryNode => ({
	tag: 'interactive',
	attrs: { type: 'native_flow', v: '1' },
	content: [{ tag: 'native_flow', attrs }]
})

const qualityControl = (): BinaryNode => ({ tag: 'quality_control', attrs: { source_type: 'third_party' } })

/** o servidor lê o nome desses fluxos no atributo do `<biz>`, sem o filho `<native_flow>` */
const BIZ_ATTR_FLOWS: ReadonlyArray<readonly [button: string, flow: string]> = [
	['payment_info', 'payment_info'],
	['review_and_pay', 'order_details']
]

/** o Android escolhe o parser pelo `<native_flow name>` da stanza, não pelo botão do proto: com `mixed` mostra "não suportado" */
const NAMED_FLOWS = ['form_message', 'catalog_message']

/**
 * `<biz>` das mensagens interativas. Recebe o conteúdo já normalizado e os atributos de
 * privacidade; devolve undefined para o que não é botão nativo, carrossel ou botão legado.
 */
export const buildInteractiveBizNode = (
	content: proto.IMessage,
	attrs: BinaryNodeAttributes
): BinaryNode | undefined => {
	const interactive = content.interactiveMessage
	const buttons = interactive?.nativeFlowMessage?.buttons?.map(button => button.name) ?? []

	const bizFlow = BIZ_ATTR_FLOWS.find(([button]) => buttons.includes(button))
	if (bizFlow) {
		return { tag: 'biz', attrs: { ...attrs, native_flow_name: bizFlow[1] } }
	}

	const named = NAMED_FLOWS.find(name => buttons.includes(name))
	if (named) {
		return { tag: 'biz', attrs, content: [flowNode({ name: named }), qualityControl()] }
	}

	// os botões ficam dentro dos cards, então o `<biz>` não sai por conta própria; sem ele o servidor descarta.
	// Só este formato exato foi aceito: com quality_control ou outro envelope vem ack 473
	if (interactive?.carouselMessage) {
		return { tag: 'biz', attrs: {}, content: [flowNode({ v: '9', name: 'mixed' })] }
	}

	if (interactive?.nativeFlowMessage || content.buttonsMessage) {
		return { tag: 'biz', attrs, content: [flowNode({ v: '9', name: 'mixed' }), qualityControl()] }
	}
}

/** `groupStatusMessageV2` embrulha a mensagem real; type e mediatype da stanza saem dela, não do embrulho */
export const unwrapGroupStatus = (message: proto.IMessage): proto.IMessage =>
	message.groupStatusMessageV2?.message ?? message

/** nó que o app Android põe ao postar status de grupo; o servidor responde com `is_group_status="true"` */
export const groupStatusNodes = (message: proto.IMessage, existing?: BinaryNode[]): BinaryNode[] => {
	if (!message.groupStatusMessageV2 || existing?.some(node => node.tag === 'meta' && node.attrs.is_group_status)) {
		return []
	}

	return [{ tag: 'meta', attrs: { is_group_status: 'true', origin: 'group_status' } }]
}
