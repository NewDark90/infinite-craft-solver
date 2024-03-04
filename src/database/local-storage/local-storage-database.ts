
export interface StorageCraftElement {
    text: string;
    emoji: string;
    discovered: boolean;
}


export class CraftStorage {

    get isAvailable() { return this.storage != null; }

    private storage: Storage | null;

    constructor(
        storage?: Storage
    ) {
        this.storage = storage ??  
            typeof window !== 'undefined' ? localStorage : null
    }

    getLocalStorageElements(): StorageCraftElement[] {
        if (!this.storage) 
            return [];

        return JSON.parse(this.storage['infinite-craft-data']).elements;
    }
    
    setLocalStorageElements(elements: StorageCraftElement[]){
        if (!this.storage)
            return;

        this.storage['infinite-craft-data'] = JSON.stringify({
            elements
        });
    }
}
