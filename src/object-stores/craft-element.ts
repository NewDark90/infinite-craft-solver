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

export const nothing = {
    text: 'Nothing',
    emoji: ""
} as const;

export const isValidElementString = (element: any): boolean => {
    return ( typeof element === 'string' &&  element !== nothing.text );
} 