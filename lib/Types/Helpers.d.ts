import { proto } from '../../WAProto/index.js';
import { MiscMessageGenerationOptions } from '../Types';
export interface OutgoingMessageOptions extends MiscMessageGenerationOptions {
    /** Envia um atraso prévio simulando digitação / gravação */
    delayMs?: number;
    /** Se true, marca a mensagem citada como lida antes de enviar a resposta */
    markReadBeforeReply?: boolean;
}
export interface SendTextOptions extends OutgoingMessageOptions {
    /** Citar uma mensagem específica (Quote) */
    quoted?: proto.IWebMessageInfo;
    /** Forçar se deve ter link preview ou não */
    linkPreview?: boolean;
}
export interface SendMediaOptions extends OutgoingMessageOptions {
    /** Legenda da mídia */
    caption?: string;
    /** Citar uma mensagem específica */
    quoted?: proto.IWebMessageInfo;
    /** Mimetype manual (opcional) */
    mimetype?: string;
    /** Nome do arquivo (para documentos) */
    fileName?: string;
}
export interface SendVoiceOptions extends OutgoingMessageOptions {
    /** Citar uma mensagem específica */
    quoted?: proto.IWebMessageInfo;
    /** Se true, envia com onda sonora / PTT verde como se tivesse gravado no celular (padrão: true) */
    ptt?: boolean;
}
export interface QuickReplyButtonItem {
    id: string;
    displayText: string;
}
export interface SendButtonsOptions extends OutgoingMessageOptions {
    title?: string;
    subtitle?: string;
    footer?: string;
    quoted?: proto.IWebMessageInfo;
}
export interface ListRowItem {
    id: string;
    title: string;
    description?: string;
}
export interface ListSectionItem {
    title: string;
    rows: ListRowItem[];
}
export interface SendListOptions extends OutgoingMessageOptions {
    title?: string;
    footer?: string;
    buttonText?: string;
    quoted?: proto.IWebMessageInfo;
}
export interface BatchContactQueryOptions {
    status?: boolean;
    devices?: boolean;
    disappearingMode?: boolean;
    botProfile?: boolean;
}
export interface BatchContactQueryResult {
    id: string;
    status?: string;
    devices?: {
        id: number;
        keyIndex?: number;
    }[];
    disappearingMode?: {
        duration: number;
        setAt: Date;
    };
    isBot?: boolean;
}
export interface QueueConfig {
    /**
     * Se a fila anti-ban está habilitada
     * @default false
     */
    enabled?: boolean;
    /**
     * Intervalo mínimo entre disparos em ms
     * @default 1000
     */
    minIntervalMs?: number;
    /**
     * Variação aleatória (jitter) máxima adicionada ao intervalo em ms
     * @default 1500
     */
    jitterMs?: number;
    /**
     * Se deve enviar automaticamente o status 'composing' (digitando...) antes de mensagens de texto
     * @default true
     */
    autoSimulateTyping?: boolean;
    /**
     * Se deve calcular o tempo de digitação dinamicamente com base no tamanho do texto
     * @default true
     */
    dynamicTyping?: boolean;
    /**
     * Tempo fixo em ms simulando digitação caso dynamicTyping esteja desativado
     * @default 1200
     */
    typingDurationMs?: number;
    /**
     * Se deve marcar a mensagem citada como lida automaticamente antes de responder
     * @default true
     */
    autoMarkReadOnReply?: boolean;
}
export interface AutoReconnectConfig {
    /**
     * Habilita reconexão automática com backoff exponencial
     * @default false
     */
    enabled?: boolean;
    /**
     * Tempo inicial de espera antes de reconectar em ms
     * @default 2000
     */
    initialDelayMs?: number;
    /**
     * Tempo máximo de espera em ms
     * @default 30000
     */
    maxDelayMs?: number;
    /**
     * Número máximo de tentativas (0 para infinito)
     * @default 0
     */
    maxRetries?: number;
}
