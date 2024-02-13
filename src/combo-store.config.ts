import { DbStoreConfig } from "./db-store.config";

export interface CraftCombination {
    first: string;
    second: string;
    result: string;
}

export const comboStoreConfig: DbStoreConfig = {
    name: "combinations",
    parameters: { 
        keyPath: [ "first", "second" ]
    } satisfies IDBObjectStoreParameters
}