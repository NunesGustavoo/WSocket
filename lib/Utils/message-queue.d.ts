import { QueueConfig } from '../Types/Helpers';
export declare class MessageQueue {
    private queue;
    private isProcessing;
    private config;
    constructor(config?: QueueConfig);
    get isEnabled(): boolean;
    get autoTyping(): boolean;
    get dynamicTyping(): boolean;
    get typingMs(): number;
    get autoMarkRead(): boolean;
    /**
     * Calcula o tempo de digitação humano proporcional ao tamanho do texto
     * (entre 800ms e 4500ms com jitter aleatório)
     */
    calculateTypingDuration(textLength?: number): number;
    updateConfig(newConfig: Partial<QueueConfig>): void;
    enqueue<T>(task: () => Promise<T>): Promise<T>;
    private processNext;
    clear(): void;
}
