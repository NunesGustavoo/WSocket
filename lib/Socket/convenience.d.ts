import { proto } from '../../WAProto/index.js';
import { AnyMessageContent, MiscMessageGenerationOptions, WAMediaUpload, WAMessage, WAMessageKey } from '../Types';
import { AutoReconnectConfig, QueueConfig, SendMediaOptions, SendTextOptions, SendVoiceOptions } from '../Types/Helpers';
import { MessageQueue } from '../Utils/message-queue';
import { ParsedMessage } from '../Utils/parse-message';
export type MessageEvents = {
    'message': (msg: ParsedMessage) => void;
    'message:text': (data: {
        msg: ParsedMessage;
        text: string;
        reply: (text: string) => Promise<proto.WebMessageInfo | undefined>;
    }) => void;
    'message:audio': (data: {
        msg: ParsedMessage;
        isVoiceNote: boolean;
        duration?: number;
    }) => void;
    'message:image': (data: {
        msg: ParsedMessage;
        caption?: string;
    }) => void;
    'message:video': (data: {
        msg: ParsedMessage;
        caption?: string;
        duration?: number;
    }) => void;
    'message:document': (data: {
        msg: ParsedMessage;
        fileName?: string;
        mimetype?: string;
    }) => void;
    'message:interactive': (data: {
        msg: ParsedMessage;
        selectedId: string;
    }) => void;
};
export declare const makeConvenienceSocket: <T extends {
    sendMessage: (jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions) => Promise<proto.WebMessageInfo | undefined>;
    sendPresenceUpdate: (type: "composing" | "recording" | "paused" | "available" | "unavailable", toJid?: string) => Promise<void>;
    readMessages: (keys: WAMessageKey[]) => Promise<void>;
    onWhatsApp: (...jids: string[]) => Promise<{
        exists: unknown;
        jid: string;
        lid?: unknown;
    }[] | undefined>;
    ev: any;
}>(sock: T, optionsConfig?: {
    queue?: QueueConfig;
    autoReconnect?: AutoReconnectConfig;
}) => T & {
    queue: MessageQueue;
    configureQueue: (config: Partial<QueueConfig>) => void;
    sendText: (jid: string, text: string, options?: SendTextOptions) => Promise<proto.WebMessageInfo | undefined>;
    sendImage: (jid: string, image: WAMediaUpload, options?: SendMediaOptions) => Promise<proto.WebMessageInfo | undefined>;
    sendVideo: (jid: string, video: WAMediaUpload, options?: SendMediaOptions) => Promise<proto.WebMessageInfo | undefined>;
    sendVoice: (jid: string, audio: WAMediaUpload, options?: SendVoiceOptions) => Promise<proto.WebMessageInfo | undefined>;
    sendDocument: (jid: string, document: WAMediaUpload, options?: SendMediaOptions) => Promise<proto.WebMessageInfo | undefined>;
    react: (key: WAMessageKey, emoji: string) => Promise<proto.WebMessageInfo | undefined>;
    markAsRead: (keys: WAMessageKey | WAMessageKey[]) => Promise<void>;
    downloadMedia: (msg: WAMessage | ParsedMessage) => Promise<Buffer>;
    resolveJid: (phoneOrJid: string) => Promise<string | undefined>;
    onMessage: (callback: MessageEvents["message"]) => any;
    onText: (callback: MessageEvents["message:text"]) => any;
    onAudio: (callback: MessageEvents["message:audio"]) => any;
    onImage: (callback: MessageEvents["message:image"]) => any;
    onInteractive: (callback: MessageEvents["message:interactive"]) => any;
};
