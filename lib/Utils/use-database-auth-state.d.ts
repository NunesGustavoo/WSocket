import { AuthenticationState } from '../Types';
/**
 * Interface genérica para adaptadores de banco de dados (PostgreSQL, Redis, MySQL, SQLite, MongoDB, etc.)
 */
export interface AuthDbAdapter {
    /**
     * Lê um valor associado a uma chave (ex: "creds", "session-123456@s.whatsapp.net:1")
     * Pode retornar a string serializada em JSON ou o objeto já desserializado.
     */
    get(key: string): Promise<string | object | null | undefined>;
    /**
     * Grava um valor serializado associado a uma chave
     */
    set(key: string, value: string): Promise<void>;
    /**
     * Remove um registro associado a uma chave
     */
    delete(key: string): Promise<void>;
    /**
     * (Opcional) Lê múltiplos valores de uma vez para alta performance
     */
    getMany?(keys: string[]): Promise<Record<string, string | object | null | undefined>>;
    /**
     * (Opcional) Grava ou remove múltiplos valores de uma vez em lote
     */
    setMany?(entries: {
        key: string;
        value: string | null;
    }[]): Promise<void>;
}
export interface DatabaseAuthStateOptions {
    /**
     * Prefixo para isolar chaves no banco quando rodar múltiplas instâncias/sessões
     * @default ''
     */
    prefix?: string;
    /**
     * Nome da chave das credenciais
     * @default 'creds'
     */
    credsKey?: string;
}
/**
 * Cria um AuthenticationState agnóstico a banco de dados.
 * Suporta Redis, PostgreSQL, MySQL, SQLite, MongoDB ou qualquer DB que implemente `AuthDbAdapter`.
 */
export declare const useDatabaseAuthState: (adapter: AuthDbAdapter, options?: DatabaseAuthStateOptions) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
