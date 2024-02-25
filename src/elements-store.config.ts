import { DbStoreConfig } from "./db-store.config";

export interface CraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
    createdStamp?: number;
}

export const elementsStore: DbStoreConfig = {
    name: "elements",
    parameters: {
        keyPath: 'text'
    }
};