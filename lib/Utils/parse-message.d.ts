import { proto } from '../../WAProto/index.js';
import { WAMessage, WAMessageContent } from '../Types';
export type ParsedMediaType = 'image' | 'video' | 'audio' | 'voice' | 'sticker' | 'document' | 'contact' | 'location';
export interface ParsedQuotedMessage {
    key: proto.IMessageKey;
    text?: string;
    sender?: string;
    message?: WAMessageContent;
}
export interface ParsedMessage {
    /** Chave identificadora única da mensagem */
    key: proto.IMessageKey;
    /** ID da mensagem */
    id: string;
    /** JID da conversa (remetente ou grupo) */
    chatId: string;
    /** JID do autor real (quando for em grupo) ou do remetente */
    sender: string;
    /** Nome de exibição (pushName) do usuário */
    pushName?: string;
    /** Indica se a mensagem foi enviada por mim mesmo */
    fromMe: boolean;
    /** Indica se é uma mensagem de grupo (@g.us) */
    isGroup: boolean;
    /** Indica se é status / stories (@broadcast) */
    isStatus: boolean;
    /** Indica se é post de canal (@newsletter) */
    isNewsletter: boolean;
    /** Timestamp Unix em segundos */
    timestamp: number;
    /** Tipo do nó de mensagem (ex: conversation, extendedTextMessage, imageMessage, etc.) */
    type?: string;
    /** Texto principal extraído (conversation, extendedTextMessage, caption de mídia, botão clicado, etc.) */
    text?: string;
    /** Tipo de mídia caso contenha */
    mediaType?: ParsedMediaType;
    /** Mimetype do arquivo se for mídia */
    mimetype?: string;
    /** Duração em segundos (para áudio/vídeo) */
    duration?: number;
    /** Se for áudio, indica se é mensagem de voz / PTT */
    isVoiceNote: boolean;
    /** Dados da mensagem citada (quote / reply), se houver */
    quoted?: ParsedQuotedMessage;
    /** Se for resposta interativa a botão/lista, o ID selecionado */
    selectedButtonId?: string;
    /** Objeto bruto original WAMessage */
    raw: WAMessage;
}
/**
 * Normaliza e extrai de forma simples e direta o conteúdo de qualquer mensagem do WhatsApp.
 * Elimina o trabalho manual de navegar em decenas de campos de protobuf.
 */
export declare const parseMessage: (msg: WAMessage) => ParsedMessage;
