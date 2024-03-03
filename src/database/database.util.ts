import { CraftElement, CraftCombination } from "./database.interface";

export const defaultElements: CraftElement[] = [
    { text: "Water", emoji: '💧', discovered: false },
    { text: "Fire", emoji: '🔥', discovered: false },
    { text: "Wind", emoji: '🌬️', discovered: false },
    { text: "Earth", emoji: '🌍', discovered: false },
];

export const nothing = {
    text: 'Nothing',
    emoji: ""
} as const;

export const sortIds = (ids: [first:string, second:string]) => ids.sort();
export const sortCombination = (combination: CraftCombination) => {
    const ids = sortIds([combination.first, combination.second]);
    combination.first = ids[0];
    combination.second = ids[1];
    return combination;
};

export const isValidElementString = (element: any): boolean => {
    return ( typeof element === 'string' &&  element !== nothing.text );
} 