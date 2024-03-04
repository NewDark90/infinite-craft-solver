
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
    getElement(element: string): Promise<CraftElement | undefined>;
    saveElement(element: CraftElement): Promise<CraftElement>;
    getAllCombinations(): Promise<CraftCombination[]>;
    getCombination(first: string, second: string): Promise<CraftCombination | undefined>;
    saveCombination(combo: CraftCombination): Promise<CraftCombination>;
}