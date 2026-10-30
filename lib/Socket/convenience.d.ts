import { proto } from '../../WAProto/index.js';
import { WACallEvent, WAMediaUpload, WAMessage, WAMessageKey } from '../Types';
import { AutoReconnectConfig, BatchContactQueryOptions, BatchContactQueryResult, ListSectionItem, QuickReplyButtonItem, QueueConfig, SendButtonsOptions, SendListOptions, SendMediaOptions, SendTextOptions, SendVoiceOptions } from '../Types/Helpers';
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
    'call': (call: WACallEvent) => void;
    'reaction': (data: {
        key: WAMessageKey;
        reaction: string;
        senderJid: string;
    }) => void;
    'group:participant': (data: {
        id: string;
        author?: string;
        participants: string[];
        action: 'add' | 'remove' | 'promote' | 'demote';
    }) => void;
};
export declare const makeConvenienceSocket: <T extends Record<string, any>>(sock: T, optionsConfig?: {
    queue?: QueueConfig;
    autoReconnect?: AutoReconnectConfig;
}) => T & {
    queue: MessageQueue;
    configureQueue: (config: Partial<QueueConfig>) => void;
    sendText: (jid: string, text: string, options?: SendTextOptions) => Promise<any>;
    sendImage: (jid: string, image: WAMediaUpload, options?: SendMediaOptions) => Promise<any>;
    sendVideo: (jid: string, video: WAMediaUpload, options?: SendMediaOptions) => Promise<any>;
    sendVoice: (jid: string, audio: WAMediaUpload, options?: SendVoiceOptions) => Promise<any>;
    sendDocument: (jid: string, document: WAMediaUpload, options?: SendMediaOptions) => Promise<any>;
    react: (key: WAMessageKey, emoji: string) => Promise<any>;
    markAsRead: (keys: WAMessageKey | WAMessageKey[]) => Promise<any>;
    downloadMedia: (msg: WAMessage | ParsedMessage) => Promise<Buffer>;
    resolveJid: (phoneOrJid: string) => Promise<string | undefined>;
    sendButtons: (jid: string, text: string, buttons: QuickReplyButtonItem[], options?: SendButtonsOptions) => Promise<any>;
    sendList: (jid: string, text: string, sections: ListSectionItem[], options?: SendListOptions) => Promise<any>;
    simulateTyping: (jid: string, durationMs?: number) => Promise<void>;
    simulateRecording: (jid: string, durationMs?: number) => Promise<void>;
    setStealthMode: (stealth: boolean) => Promise<any>;
    batchQueryContacts: (jids: string[], options?: BatchContactQueryOptions) => Promise<BatchContactQueryResult[]>;
    fetchChatHistory: (count: number, oldestMsgKey: WAMessageKey, oldestMsgTimestamp: number | Long) => Promise<any>;
    onMessage: (callback: MessageEvents["message"]) => any;
    onText: (callback: MessageEvents["message:text"]) => any;
    onAudio: (callback: MessageEvents["message:audio"]) => any;
    onImage: (callback: MessageEvents["message:image"]) => any;
    onInteractive: (callback: MessageEvents["message:interactive"]) => any;
    postTextStatus: (text: string, options?: {
        backgroundColor?: string;
        font?: number;
        statusJidList?: string[];
    }) => Promise<any>;
    postMediaStatus: (content: {
        image: WAMediaUpload;
        caption?: string;
    } | {
        video: WAMediaUpload;
        caption?: string;
    }, options?: {
        statusJidList?: string[];
    }) => Promise<any>;
    pinChat: (jid: string, pin?: boolean) => Promise<any>;
    muteChat: (jid: string, durationMs?: number | null) => Promise<any>;
    archiveChat: (jid: string, archive?: boolean, lastMessages?: any[]) => Promise<any>;
    starMessage: (jid: string, messages: {
        id: string;
        fromMe?: boolean;
    }[], star?: boolean) => Promise<any>;
    rejectCall: (callId: string, callFrom: string) => Promise<any>;
    onCall: (callback: MessageEvents["call"]) => any;
    onGroupParticipantsUpdate: (callback: MessageEvents["group:participant"]) => any;
    onReaction: (callback: MessageEvents["reaction"]) => any;
};
