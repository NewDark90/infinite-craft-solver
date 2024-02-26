import { DbStoreConfig } from "./db-store.config";

export interface CraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
    createdStamp?: number;
}

export interface LocalStorageCraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
}

export const elementsStore: DbStoreConfig = {
    name: "elements",
    parameters: {
        keyPath: 'text'
    }
};

export const nothing = {
    text: 'Nothing',
    emoji: ""
} as const;

export const isValidElementString = (element: any): boolean => {
    return ( typeof element === 'string' &&  element !== nothing.text );
} 