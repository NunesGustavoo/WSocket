import type { proto } from '../../WAProto';
import type { BinaryNode, BinaryNodeAttributes } from '../WABinary';
/**
 * `<biz>` das mensagens interativas. Recebe o conteúdo já normalizado e os atributos de
 * privacidade; devolve undefined para o que não é botão nativo, carrossel ou botão legado.
 */
export declare const buildInteractiveBizNode: (content: proto.IMessage, attrs: BinaryNodeAttributes) => BinaryNode | undefined;
/** `groupStatusMessageV2` embrulha a mensagem real; type e mediatype da stanza saem dela, não do embrulho */
export declare const unwrapGroupStatus: (message: proto.IMessage) => proto.IMessage;
/** nó que o app Android põe ao postar status de grupo; o servidor responde com `is_group_status="true"` */
export declare const groupStatusNodes: (message: proto.IMessage, existing?: BinaryNode[]) => BinaryNode[];
