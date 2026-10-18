import type { NewsletterPage, NewsletterPost, NewsletterQuestionResponse } from '../Types/Newsletter';
import type { BinaryNode } from '../WABinary';
export type DecodeMessage = (bytes: Uint8Array) => any;
export declare const isNewsletterServerId: (value: unknown) => value is string;
export declare const isNewsletterPageCount: (count: unknown) => count is number;
/** `<messages type="jid">` vai para s.whatsapp.net */
export declare function buildNewsletterMessagesIq(jid: string, count: number, before?: string | null): BinaryNode;
/** ao contrário dos posts, o IQ de respostas vai para o JID do canal */
export declare function buildNewsletterQuestionResponsesIq(jid: string, serverId: string, count: number, before?: string | null): BinaryNode;
/** `list` é o nó `<messages jid>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
export declare function parseNewsletterPosts(list: BinaryNode | undefined, count: number, decode: DecodeMessage): NewsletterPage<'messages', NewsletterPost>;
/** `list` é o nó `<question_responses server_id>` da resposta (undefined = página vazia); sem reordenar nem filtrar */
export declare function parseNewsletterQuestionResponses(list: BinaryNode | undefined, count: number, decode: DecodeMessage): NewsletterPage<'responses', NewsletterQuestionResponse>;
