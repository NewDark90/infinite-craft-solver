import { DbStoreConfig } from "./db-store.config";

export interface CraftCombination {
    first: string;
    second: string;
    result: {
        text: string;
        emoji: string;
    };
    createdStamp?: number;
}

export const comboStoreConfig: DbStoreConfig = {
    name: "combinations",
    parameters: { 
        keyPath: [ "first", "second" ]
    } satisfies IDBObjectStoreParameters
}

export const sortIds = (ids: [first:string, second:string]) => ids.sort();
export const sortCombination = (combination: CraftCombination) => {
    const ids = sortIds([combination.first, combination.second]);
    combination.first = ids[0];
    combination.second = ids[1];
    return combination;
};