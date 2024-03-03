
export interface CraftCombination {
    first: string;
    second: string;
    result: CraftElement;
    createdStamp?: number;
};

export interface CraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
    createdStamp?: number;
}

export interface CraftDatabase {
    getAllElements(): Promise<CraftElement[]>;
    getElement(element: string): Promise<CraftElement>;
    saveElement(element: CraftElement): Promise<CraftElement>;
    getAllCombinations(): Promise<CraftCombination[]>;
    getCombination(first: string, second: string): Promise<CraftCombination>;
    saveCombination(combo: CraftCombination): Promise<CraftCombination>;
    importElements(other: CraftDatabase): Promise<void>;
    syncElements(other: CraftDatabase): Promise<void>;
    importCombinations(other: CraftDatabase): Promise<void>;
    syncCombinations(other: CraftDatabase): Promise<void>;
}