"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupStatusNodes = exports.unwrapGroupStatus = exports.buildInteractiveBizNode = void 0;
// Formatos conferidos no Android e no WhatsApp Web em jobasfernandes/zapo-interactive-examples (docs/delivery-matrix.md)
const flowNode = (attrs) => ({
    tag: 'interactive',
    attrs: { type: 'native_flow', v: '1' },
    content: [{ tag: 'native_flow', attrs }]
});
const qualityControl = () => ({ tag: 'quality_control', attrs: { source_type: 'third_party' } });
/** o servidor lê o nome desses fluxos no atributo do `<biz>`, sem o filho `<native_flow>` */
const BIZ_ATTR_FLOWS = [
    ['payment_info', 'payment_info'],
    ['review_and_pay', 'order_details']
];
/** o Android escolhe o parser pelo `<native_flow name>` da stanza, não pelo botão do proto: com `mixed` mostra "não suportado" */
const NAMED_FLOWS = ['form_message', 'catalog_message'];
/**
 * `<biz>` das mensagens interativas. Recebe o conteúdo já normalizado e os atributos de
 * privacidade; devolve undefined para o que não é botão nativo, carrossel ou botão legado.
 */
const buildInteractiveBizNode = (content, attrs) => {
    var _a, _b, _c;
    const interactive = content.interactiveMessage;
    const buttons = (_c = (_b = (_a = interactive === null || interactive === void 0 ? void 0 : interactive.nativeFlowMessage) === null || _a === void 0 ? void 0 : _a.buttons) === null || _b === void 0 ? void 0 : _b.map(button => button.name)) !== null && _c !== void 0 ? _c : [];
    const bizFlow = BIZ_ATTR_FLOWS.find(([button]) => buttons.includes(button));
    if (bizFlow) {
        return { tag: 'biz', attrs: { ...attrs, native_flow_name: bizFlow[1] } };
    }
    const named = NAMED_FLOWS.find(name => buttons.includes(name));
    if (named) {
        return { tag: 'biz', attrs, content: [flowNode({ name: named }), qualityControl()] };
    }
    // os botões ficam dentro dos cards, então o `<biz>` não sai por conta própria; sem ele o servidor descarta.
    // Só este formato exato foi aceito: com quality_control ou outro envelope vem ack 473
    if (interactive === null || interactive === void 0 ? void 0 : interactive.carouselMessage) {
        return { tag: 'biz', attrs: {}, content: [flowNode({ v: '9', name: 'mixed' })] };
    }
    if ((interactive === null || interactive === void 0 ? void 0 : interactive.nativeFlowMessage) || content.buttonsMessage) {
        return { tag: 'biz', attrs, content: [flowNode({ v: '9', name: 'mixed' }), qualityControl()] };
    }
};
exports.buildInteractiveBizNode = buildInteractiveBizNode;
/** `groupStatusMessageV2` embrulha a mensagem real; type e mediatype da stanza saem dela, não do embrulho */
const unwrapGroupStatus = (message) => { var _a, _b; return (_b = (_a = message.groupStatusMessageV2) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : message; };
exports.unwrapGroupStatus = unwrapGroupStatus;
/** nó que o app Android põe ao postar status de grupo; o servidor responde com `is_group_status="true"` */
const groupStatusNodes = (message, existing) => {
    if (!message.groupStatusMessageV2 || (existing === null || existing === void 0 ? void 0 : existing.some(node => node.tag === 'meta' && node.attrs.is_group_status))) {
        return [];
    }
    return [{ tag: 'meta', attrs: { is_group_status: 'true', origin: 'group_status' } }];
};
exports.groupStatusNodes = groupStatusNodes;
