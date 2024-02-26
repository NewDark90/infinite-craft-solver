import { DbStoreConfig } from "../db-store.config";

export const elementsStoreConfig: DbStoreConfig = {
    name: "elements",
    parameters: {
        keyPath: 'text'
    }
};
