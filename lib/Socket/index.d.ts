import { Boom } from '@hapi/boom';
import { UserFacingSocketConfig } from '../Types';
declare const makeWASocket: (config: UserFacingSocketConfig) => {
    logger: import("../Utils/logger").ILogger;
    sendStatus: (content: import("../Types").AnyMessageContent, options: import("../Types").StatusMessageOptions) => Promise<import("../Types").WAProto.WebMessageInfo | undefined>;
    getOrderDetails: (orderId: string, tokenBase64: string) => Promise<import("../Types").OrderDetails>;
    getCatalog: ({ jid, limit, cursor }: import("../Types").GetCatalogOptions) => Promise<{
        products: import("../Types").Product[];
        nextPageCursor: string | undefined;
    }>;
    getCollections: (jid?: string, limit?: number) => Promise<{
        collections: import("../Types").CatalogCollection[];
    }>;
    productCreate: (create: import("../Types").ProductCreate) => Promise<import("../Types").Product>;
    productDelete: (productIds: string[]) => Promise<{
        deleted: number;
    }>;
    productUpdate: (productId: string, update: import("../Types").ProductUpdate) => Promise<import("../Types").Product>;
    newsletterFollow: (jid: string) => Promise<void>;
    newsletterUnfollow: (jid: string) => Promise<void>;
    newsletterMute: (jid: string) => Promise<void>;
    newsletterUnmute: (jid: string) => Promise<void>;
    newsletterAdminCount: (jid: string) => Promise<number>;
    newsletterChangeOwner: (jid: string, newOwnerLid: string) => Promise<void>;
    newsletterReactMessage: (jid: string, serverId: string, reaction?: string) => Promise<void>;
    subscribeNewsletterUpdates: (jid: string) => Promise<{
        duration: string;
    } | null>;
    newsletterFetchMessages: (jid: string, { count, before }: {
        count: number;
        before?: string | null;
    }) => Promise<{
        messages: import("../Types").NewsletterPost[];
        nextBefore: string | null;
        hasNextPage: boolean;
    }>;
    newsletterQuestionResponses: (jid: string, serverId: string, { count, before }: {
        count: number;
        before?: string | null;
    }) => Promise<{
        responses: import("../Types").NewsletterQuestionResponse[];
        nextBefore: string | null;
        hasNextPage: boolean;
    }>;
    newsletterList: () => Promise<import("../Types").NewsletterMetadata[]>;
    newsletterMetadata: (jid: string) => Promise<import("../Types").NewsletterMetadata>;
    newsletterMetadataByInvite: (inviteCode: string) => Promise<import("../Types").NewsletterMetadata>;
    newsletterCreate: (params: {
        name: string;
        description?: string;
        picture?: Buffer;
    }) => Promise<import("../Types").NewsletterMetadata>;
    newsletterUpdate: (jid: string, params: {
        name?: string;
        description?: string;
        picture?: Buffer | null;
    }) => Promise<import("../Types").NewsletterMetadata>;
    newsletterDelete: (jid: string) => Promise<void>;
    newsletterAdminInvite: (jid: string, userLid: string, dm?: {
        to: string;
        newsletterName?: string;
        caption?: string;
    }) => Promise<import("../Types").NewsletterAdminInviteResult>;
    newsletterAdminInviteRevoke: (jid: string, userLid: string) => Promise<void>;
    newsletterAdminDemote: (jid: string, userLid: string) => Promise<void>;
    newsletterSendText: (jid: string, text: string, opts?: {
        messageId?: string;
        timeoutMs?: number;
        question?: boolean;
    }) => Promise<import("../Types").NewsletterSendResult>;
    newsletterSendImage: (jid: string, image: Buffer, opts?: {
        caption?: string;
        messageId?: string;
        timeoutMs?: number;
        question?: boolean;
    }) => Promise<import("../Types").NewsletterSendResult>;
    newsletterSendVideo: (jid: string, video: Buffer, opts?: {
        caption?: string;
        gifPlayback?: boolean;
        messageId?: string;
        timeoutMs?: number;
    }) => Promise<import("../Types").NewsletterSendResult>;
    newsletterSendAudio: (jid: string, audio: Buffer, opts?: {
        ptt?: boolean;
        messageId?: string;
        timeoutMs?: number;
    }) => Promise<import("../Types").NewsletterSendResult>;
    newsletterSendSticker: (jid: string, sticker: Buffer, opts?: {
        isAnimated?: boolean;
        messageId?: string;
        timeoutMs?: number;
    }) => Promise<import("../Types").NewsletterSendResult>;
    newsletterSendPoll: (jid: string, poll: import("../Types").NewsletterPoll, opts?: {
        messageId?: string;
        timeoutMs?: number;
    }) => Promise<import("../Types").NewsletterSendResult>;
    sendMessageAck: (node: import("..").BinaryNode, errorCode?: number) => Promise<void>;
    sendRetryRequest: (node: import("..").BinaryNode, forceIncludeKeys?: boolean, retryReason?: string) => Promise<void>;
    rejectCall: (callId: string, callFrom: string) => Promise<void>;
    fetchMessageHistory: (count: number, oldestMsgKey: import("../Types").WAMessageKey, oldestMsgTimestamp: number | import("long").default) => Promise<string>;
    requestPlaceholderResend: (messageKey: import("../Types").WAMessageKey) => Promise<string | undefined>;
    getPrivacyTokens: (jids: string[], timestamp?: number) => Promise<import("..").BinaryNode>;
    reissueTcTokenAfterIdentityChange: (jid: string) => Promise<void>;
    scheduleTcTokenPrune: () => void;
    cancelTcTokenPrune: () => void;
    getLidForPn: import("..").LidResolver;
    cacheLidMapping: (pnJid?: string, lidJid?: string) => void;
    tcTokenStorageJid: (jid: string) => string;
    trackTcTokenJid: (jid: string) => void;
    flushTcTokenIndex: () => Promise<void>;
    withFlushedTcTokenIndex: <T>(task: () => Promise<T>) => Promise<T>;
    assertSessions: (jids: string[], force: boolean, lids?: string) => Promise<boolean>;
    relayMessage: (jid: string, message: import("../Types").WAProto.IMessage, { messageId: msgId, participant, additionalAttributes, additionalNodes, useUserDevicesCache, useCachedGroupMetadata, statusJidList, newsletterMediaId, isretry, includeJids, decryptFailHide }: import("../Types").MessageRelayOptions) => Promise<string>;
    sendReceipt: (jid: string, participant: string | undefined, messageIds: string[], type: import("../Types").MessageReceiptType) => Promise<void>;
    sendReceipts: (keys: import("../Types").WAMessageKey[], type: import("../Types").MessageReceiptType) => Promise<void>;
    readMessages: (keys: import("../Types").WAMessageKey[]) => Promise<void>;
    refreshMediaConn: (forceGet?: boolean) => Promise<import("../Types").MediaConnInfo>;
    waUploadToServer: import("../Types").WAMediaUploadFunction;
    fetchPrivacySettings: (force?: boolean) => Promise<{
        [_: string]: string;
    }>;
    sendPeerDataOperationMessage: (pdoMessage: import("../Types").WAProto.Message.IPeerDataOperationRequestMessage) => Promise<string>;
    createParticipantNodes: (jids: string[], message: import("../Types").WAProto.IMessage, extraAttrs?: import("..").BinaryNode["attrs"], lid?: any, meid?: any, melid?: any) => Promise<{
        nodes: import("..").BinaryNode[];
        shouldIncludeDeviceIdentity: boolean;
        failedJids: string[];
    }>;
    getUSyncDevices: (jids: string[], useCache: boolean, ignoreZeroDevices: boolean) => Promise<import("..").JidWithDevice[]>;
    userDevicesCache: import("../Types").CacheStore;
    getSelectiveRelayContext: (groupJid: string, messageId: string) => {
        groupJid: string;
        allowedUsers: string[];
        decryptFailHide: boolean;
    } | undefined;
    getSelectiveSentMessage: (groupJid: string, messageId: string) => import("../Types").WAProto.IMessage | undefined;
    updateMediaMessage: (message: import("../Types").WAProto.IWebMessageInfo) => Promise<import("../Types").WAProto.IWebMessageInfo>;
    sendMessage: (jid: string, content: import("../Types").AnyMessageContent, options?: import("../Types").MiscMessageGenerationOptions) => Promise<import("../Types").WAProto.WebMessageInfo | undefined>;
    groupMetadata: (jid: string) => Promise<import("../Types").GroupMetadata>;
    groupCreate: (subject: string, participants: string[]) => Promise<import("../Types").GroupMetadata>;
    groupLeave: (id: string) => Promise<void>;
    groupUpdateSubject: (jid: string, subject: string) => Promise<void>;
    groupRequestParticipantsList: (jid: string) => Promise<{
        [key: string]: string;
    }[]>;
    groupRequestParticipantsUpdate: (jid: string, participants: string[], action: "approve" | "reject") => Promise<{
        status: string;
        jid: string;
        lid: string;
    }[]>;
    groupParticipantsUpdate: (jid: string, participants: string[], action: import("../Types").ParticipantAction) => Promise<{
        status: string;
        jid: string;
        lid: string;
        content: import("..").BinaryNode;
    }[]>;
    groupUpdateDescription: (jid: string, description?: string) => Promise<void>;
    groupInviteCode: (jid: string) => Promise<string | undefined>;
    groupRevokeInvite: (jid: string) => Promise<string | undefined>;
    groupAcceptInvite: (code: string) => Promise<string | undefined>;
    groupRevokeInviteV4: (groupJid: string, invitedJid: string) => Promise<boolean>;
    groupAcceptInviteV4: (key: string | import("../Types").WAMessageKey, inviteMessage: import("../Types").WAProto.Message.IGroupInviteMessage) => Promise<any>;
    groupGetInviteInfo: (code: string) => Promise<import("../Types").GroupMetadata>;
    groupToggleEphemeral: (jid: string, ephemeralExpiration: number) => Promise<void>;
    groupSettingUpdate: (jid: string, setting: "announcement" | "not_announcement" | "locked" | "unlocked") => Promise<void>;
    groupMemberAddMode: (jid: string, mode: "admin_add" | "all_member_add") => Promise<void>;
    groupJoinApprovalMode: (jid: string, mode: "on" | "off") => Promise<void>;
    groupFetchAllParticipating: () => Promise<{
        [_: string]: import("../Types").GroupMetadata;
    }>;
    getBotListV2: () => Promise<import("../Types").BotListInfo[]>;
    messageMutex: {
        mutex<T>(chat: string, author: string, task: () => Promise<T> | T): Promise<T>;
    };
    receiptMutex: {
        mutex<T>(code: () => Promise<T> | T): Promise<T>;
    };
    notificationMutex: {
        mutex<T>(code: () => Promise<T> | T): Promise<T>;
    };
    appStatePatchMutex: {
        mutex<T>(code: () => Promise<T> | T): Promise<T>;
    };
    placeholderResendCache: import("../Types").CacheStore;
    upsertMessage: (msg: import("../Types").WAMessage, type: import("../Types").MessageUpsertType) => Promise<void>;
    appPatch: (patchCreate: import("../Types").WAPatchCreate) => Promise<void>;
    sendPresenceUpdate: (type: import("../Types").WAPresence, toJid?: string) => Promise<void>;
    presenceSubscribe: (toJid: string, tcToken?: Buffer) => Promise<void>;
    profilePictureUrl: (jid: string, type?: "preview" | "image", timeoutMs?: number) => Promise<string | undefined>;
    onWhatsApp: (...jids: string[]) => Promise<{
        jid: string;
        exists: unknown;
        lid: unknown;
    }[] | undefined>;
    fetchBlocklist: () => Promise<string[]>;
    fetchStatus: (...jids: string[]) => Promise<import("..").USyncQueryResultList[] | undefined>;
    fetchDisappearingDuration: (...jids: string[]) => Promise<import("..").USyncQueryResultList[] | undefined>;
    updateProfilePicture: (jid: string, content: import("../Types").WAMediaUpload, dimensions?: {
        width: number;
        height: number;
    }) => Promise<void>;
    removeProfilePicture: (jid: string) => Promise<void>;
    updateProfileStatus: (status: string) => Promise<void>;
    updateProfileName: (name: string) => Promise<void>;
    updateBlockStatus: (jid: string, action: "block" | "unblock") => Promise<void>;
    updateCallPrivacy: (value: import("../Types").WAPrivacyCallValue) => Promise<void>;
    updateMessagesPrivacy: (value: import("../Types").WAPrivacyMessagesValue) => Promise<void>;
    updateLastSeenPrivacy: (value: import("../Types").WAPrivacyValue) => Promise<void>;
    updateOnlinePrivacy: (value: import("../Types").WAPrivacyOnlineValue) => Promise<void>;
    updateProfilePicturePrivacy: (value: import("../Types").WAPrivacyValue) => Promise<void>;
    updateStatusPrivacy: (value: import("../Types").WAPrivacyValue) => Promise<void>;
    updateReadReceiptsPrivacy: (value: import("../Types").WAReadReceiptsValue) => Promise<void>;
    updateGroupsAddPrivacy: (value: import("../Types").WAPrivacyGroupAddValue) => Promise<void>;
    updateDefaultDisappearingMode: (duration: number) => Promise<void>;
    getBusinessProfile: (jid: string) => Promise<import("../Types").WABusinessProfile | void>;
    resyncAppState: (collections: readonly ("critical_unblock_low" | "regular_high" | "regular_low" | "critical_block" | "regular")[], isInitialSync: boolean) => Promise<{
        failedCollections: import("../Types").WAPatchName[];
    }>;
    chatModify: (mod: import("../Types").ChatModification, jid: string) => Promise<void>;
    cleanDirtyBits: (type: "account_sync" | "groups", fromTimestamp?: number | string) => Promise<void>;
    addOrEditContact: (jid: string, contact: import("../Types").WAProto.SyncActionValue.IContactAction) => Promise<void>;
    removeContact: (jid: string) => Promise<void>;
    addLabel: (jid: string, labels: import("../Types/Label").LabelActionBody) => Promise<void>;
    addChatLabel: (jid: string, labelId: string) => Promise<void>;
    removeChatLabel: (jid: string, labelId: string) => Promise<void>;
    addMessageLabel: (jid: string, messageId: string, labelId: string) => Promise<void>;
    removeMessageLabel: (jid: string, messageId: string, labelId: string) => Promise<void>;
    star: (jid: string, messages: {
        id: string;
        fromMe?: boolean;
    }[], star: boolean) => Promise<void>;
    executeUSyncQuery: (usyncQuery: import("..").USyncQuery) => Promise<import("..").USyncQueryResult | undefined>;
    type: "md";
    ws: import("./Client").WebSocketClient;
    ev: import("../Types").BaileysEventEmitter & {
        process(handler: (events: Partial<import("../Types").BaileysEventMap>) => void | Promise<void>): () => void;
        buffer(): void;
        createBufferedFunction<A extends any[], T>(work: (...args: A) => Promise<T>): (...args: A) => Promise<T>;
        flush(force?: boolean): boolean;
        isBuffering(): boolean;
    };
    authState: {
        creds: import("../Types").AuthenticationCreds;
        keys: import("../Types").SignalKeyStoreWithTransaction;
    };
    signalRepository: import("../Types").SignalRepository;
    user: import("../Types").Contact | undefined;
    generateMessageTag: () => string;
    query: (node: import("..").BinaryNode, timeoutMs?: number) => Promise<any>;
    mexQuery: <T = any>(variables: Record<string, any>, queryId: string, key: string) => Promise<T | undefined>;
    waitForMessage: <T>(msgId: string, timeoutMs?: number | undefined) => Promise<any>;
    waitForSocketOpen: () => Promise<void>;
    sendRawMessage: (data: Uint8Array | Buffer) => Promise<void>;
    sendNode: (frame: import("..").BinaryNode) => Promise<void>;
    logout: (msg?: string) => Promise<void>;
    end: (error: Error | undefined) => void;
    onUnexpectedError: (err: Error | Boom, msg: string) => void;
    onSocketEnd: (handler: () => void) => void;
    uploadPreKeys: (count?: number) => Promise<void>;
    uploadPreKeysToServerIfRequired: () => Promise<void>;
    requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
    waitForConnectionUpdate: (check: (u: Partial<import("../Types").ConnectionState>) => Promise<boolean | undefined>, timeoutMs?: number) => Promise<void>;
    sendWAMBuffer: (wamBuffer: Buffer) => Promise<any>;
} & {
    queue: import("..").MessageQueue;
    configureQueue: (config: Partial<import("../Types").QueueConfig>) => void;
    sendText: (jid: string, text: string, options?: import("../Types").SendTextOptions) => Promise<any>;
    sendImage: (jid: string, image: import("../Types").WAMediaUpload, options?: import("../Types").SendMediaOptions) => Promise<any>;
    sendVideo: (jid: string, video: import("../Types").WAMediaUpload, options?: import("../Types").SendMediaOptions) => Promise<any>;
    sendVoice: (jid: string, audio: import("../Types").WAMediaUpload, options?: import("../Types").SendVoiceOptions) => Promise<any>;
    sendDocument: (jid: string, document: import("../Types").WAMediaUpload, options?: import("../Types").SendMediaOptions) => Promise<any>;
    react: (key: import("../Types").WAMessageKey, emoji: string) => Promise<any>;
    markAsRead: (keys: import("../Types").WAMessageKey | import("../Types").WAMessageKey[]) => Promise<any>;
    downloadMedia: (msg: import("../Types").WAMessage | import("..").ParsedMessage) => Promise<Buffer>;
    resolveJid: (phoneOrJid: string) => Promise<string | undefined>;
    sendButtons: (jid: string, text: string, buttons: import("../Types").QuickReplyButtonItem[], options?: import("../Types").SendButtonsOptions) => Promise<any>;
    sendList: (jid: string, text: string, sections: import("../Types").ListSectionItem[], options?: import("../Types").SendListOptions) => Promise<any>;
    simulateTyping: (jid: string, durationMs?: number) => Promise<void>;
    simulateRecording: (jid: string, durationMs?: number) => Promise<void>;
    setStealthMode: (stealth: boolean) => Promise<any>;
    batchQueryContacts: (jids: string[], options?: import("../Types").BatchContactQueryOptions) => Promise<import("../Types").BatchContactQueryResult[]>;
    fetchChatHistory: (count: number, oldestMsgKey: import("../Types").WAMessageKey, oldestMsgTimestamp: number | Long) => Promise<any>;
    onMessage: (callback: import("./convenience").MessageEvents["message"]) => any;
    onText: (callback: import("./convenience").MessageEvents["message:text"]) => any;
    onAudio: (callback: import("./convenience").MessageEvents["message:audio"]) => any;
    onImage: (callback: import("./convenience").MessageEvents["message:image"]) => any;
    onInteractive: (callback: import("./convenience").MessageEvents["message:interactive"]) => any;
    postTextStatus: (text: string, options?: {
        backgroundColor?: string;
        font?: number;
        statusJidList?: string[];
    }) => Promise<any>;
    postMediaStatus: (content: {
        image: import("../Types").WAMediaUpload;
        caption?: string;
    } | {
        video: import("../Types").WAMediaUpload;
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
    onCall: (callback: import("./convenience").MessageEvents["call"]) => any;
    onGroupParticipantsUpdate: (callback: import("./convenience").MessageEvents["group:participant"]) => any;
    onReaction: (callback: import("./convenience").MessageEvents["reaction"]) => any;
};
export default makeWASocket;
