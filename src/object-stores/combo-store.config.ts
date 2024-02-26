import { DbStoreConfig } from "../db-store.config";

export const comboStoreConfig: DbStoreConfig = {
    name: "combinations",
    parameters: { 
        keyPath: [ "first", "second" ]
    } satisfies IDBObjectStoreParameters
}
