import { AxiosRequestConfig } from 'axios';
import { proto } from '../../WAProto';
import { Chat, Contact } from '../Types';
export interface ProcessedHistorySync {
    chats: Chat[];
    contacts: Contact[];
    messages: proto.IWebMessageInfo[];
    syncType: proto.HistorySync.HistorySyncType;
    progress?: number | null;
    nctSalt?: Uint8Array | null;
    conversations: Chat[];
}
export declare const downloadHistoryBuffer: (msg: proto.Message.IHistorySyncNotification, options: AxiosRequestConfig<{}>) => Promise<Buffer>;
export declare const downloadHistory: (msg: proto.Message.IHistorySyncNotification, options: AxiosRequestConfig<{}>) => Promise<proto.HistorySync>;
export declare const processHistorySyncBuffer: (buffer: Buffer, onMessage?: (message: proto.IWebMessageInfo) => void) => ProcessedHistorySync;
export declare const processHistoryMessage: (item: proto.IHistorySync) => {
    chats: Chat[];
    contacts: Contact[];
    messages: proto.IWebMessageInfo[];
    syncType: proto.HistorySync.HistorySyncType;
    progress: number | null | undefined;
};
export declare const downloadAndProcessHistorySyncNotification: (msg: proto.Message.IHistorySyncNotification, options: AxiosRequestConfig<{}>) => Promise<ProcessedHistorySync>;
export declare const getHistoryMsg: (message: proto.IMessage) => proto.Message.IHistorySyncNotification | null | undefined;
