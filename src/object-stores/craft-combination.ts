import { CraftElement } from ".";

export interface CraftCombination {
    first: string;
    second: string;
    result: CraftElement;
    createdStamp?: number;
};

export const sortIds = (ids: [first:string, second:string]) => ids.sort();
export const sortCombination = (combination: CraftCombination) => {
    const ids = sortIds([combination.first, combination.second]);
    combination.first = ids[0];
    combination.second = ids[1];
    return combination;
};