"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = void 0;
class MessageQueue {
    constructor(config) {
        var _a, _b, _c, _d, _e, _f, _g;
        this.queue = [];
        this.isProcessing = false;
        this.config = {
            enabled: (_a = config === null || config === void 0 ? void 0 : config.enabled) !== null && _a !== void 0 ? _a : false,
            minIntervalMs: (_b = config === null || config === void 0 ? void 0 : config.minIntervalMs) !== null && _b !== void 0 ? _b : 1000,
            jitterMs: (_c = config === null || config === void 0 ? void 0 : config.jitterMs) !== null && _c !== void 0 ? _c : 1500,
            autoSimulateTyping: (_d = config === null || config === void 0 ? void 0 : config.autoSimulateTyping) !== null && _d !== void 0 ? _d : true,
            dynamicTyping: (_e = config === null || config === void 0 ? void 0 : config.dynamicTyping) !== null && _e !== void 0 ? _e : true,
            typingDurationMs: (_f = config === null || config === void 0 ? void 0 : config.typingDurationMs) !== null && _f !== void 0 ? _f : 1200,
            autoMarkReadOnReply: (_g = config === null || config === void 0 ? void 0 : config.autoMarkReadOnReply) !== null && _g !== void 0 ? _g : true
        };
    }
    get isEnabled() {
        return this.config.enabled;
    }
    get autoTyping() {
        return this.config.autoSimulateTyping;
    }
    get dynamicTyping() {
        return this.config.dynamicTyping;
    }
    get typingMs() {
        return this.config.typingDurationMs;
    }
    get autoMarkRead() {
        return this.config.autoMarkReadOnReply;
    }
    /**
     * Calcula o tempo de digitação humano proporcional ao tamanho do texto
     * (entre 800ms e 4500ms com jitter aleatório)
     */
    calculateTypingDuration(textLength = 0) {
        if (!this.config.dynamicTyping) {
            return this.config.typingDurationMs;
        }
        const basePerChar = 25; // 25ms por caractere
        const calculated = 800 + (textLength * basePerChar);
        const jitter = Math.floor(Math.random() * 400); // 0-400ms de variação
        return Math.min(4500, Math.max(800, calculated + jitter));
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    enqueue(task) {
        if (!this.config.enabled) {
            return task();
        }
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
            });
            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }
    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        this.isProcessing = true;
        const currentTask = this.queue.shift();
        if (currentTask) {
            try {
                await currentTask();
            }
            catch (_a) { }
            const jitter = Math.floor(Math.random() * (this.config.jitterMs + 1));
            const delay = this.config.minIntervalMs + jitter;
            await new Promise(r => setTimeout(r, delay));
        }
        this.processNext();
    }
    clear() {
        this.queue = [];
        this.isProcessing = false;
    }
}
exports.MessageQueue = MessageQueue;
