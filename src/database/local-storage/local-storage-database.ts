
export interface LocalStorageCraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
}


export class CraftLocalStorage {

    getLocalStorageElements(): LocalStorageCraftElement[] {
        return JSON.parse(localStorage['infinite-craft-data']).elements;
    }
    
    setLocalStorageElements(elements: LocalStorageCraftElement[]){
        localStorage['infinite-craft-data'] = JSON.stringify({
            elements
        });
    }
}
