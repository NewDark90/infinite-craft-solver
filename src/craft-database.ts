import { CraftCombination, comboStoreConfig, sortCombination } from "./combo-store.config";
import { CraftElement, elementsStore } from "./elements-store.config";




export class CraftDatabase {

    private readonly version = 2;
    private readonly databaseName = "craft-db"
    private database?: Promise<IDBDatabase>;

    constructor(

    ) {
    }

    async open(): Promise<IDBDatabase> {
        if (!this.database) {
            this.database = new Promise<IDBDatabase>((resolve, reject) => {
                const openRequest = indexedDB.open(this.databaseName, this.version);
    
                openRequest.addEventListener("upgradeneeded", (event) => {
                    const database = openRequest.result;
                    console.log(`Upgrading database from ${event.oldVersion} to version ${event.newVersion}`);
                    const comboStore = database.createObjectStore(comboStoreConfig.name, comboStoreConfig.parameters);
                    const elementStore = database.createObjectStore(elementsStore.name, elementsStore.parameters);
                    comboStore.createIndex("first", "first" satisfies keyof CraftCombination, {unique: false});
                    comboStore.createIndex("second", "second" satisfies keyof CraftCombination, {unique: false});
                    comboStore.createIndex("result", "result" satisfies keyof CraftCombination, {unique: false});
                    elementStore.createIndex("text", "text" satisfies keyof CraftElement, {unique: false});
                    elementStore.createIndex("emoji", "emoji" satisfies keyof CraftElement, {unique: false});
                    elementStore.createIndex("discovered", "discovered" satisfies keyof CraftElement, {unique: false});
                    resolve(database);
                }) ;
                openRequest.addEventListener("success", (event) => {
                    console.log('running onsuccess');
                    const database = openRequest.result;
                    resolve(database);
                });
                openRequest.addEventListener("error", (event) => {
                    console.error(event);
                    reject(event);
                });
            });
        }
        return this.database;
    }

    getLocalStorageElements(): CraftElement[] {
        return JSON.parse(localStorage['infinite-craft-data']).elements;
    }

    setLocalStorageElements(elements: CraftElement[]){
        localStorage['infinite-craft-data'] = JSON.stringify({
            elements
        });
    }

    async getElement(element: string): Promise<CraftElement> {
        const database = await this.open();
        const transaction = database.transaction(elementsStore.name, "readonly");
        const elementStore = transaction.objectStore(elementsStore.name);
        const getPromise = new Promise<CraftElement>(
            (resolve, reject) => {
                const getRequest: IDBRequest<CraftElement> = elementStore.get(element);
                getRequest.onsuccess = (_event) => {
                    resolve(getRequest.result);
                };
                getRequest.onerror = (event) => {
                    console.error(event);
                    reject(event);
                };
            }
        );
        return getPromise;
    }

    async saveElement(element: CraftElement) {
        if (!element) {
            return;
        }
        const database = await this.open();
        const transaction = database.transaction(elementsStore.name, "readwrite");
        const elementStore = transaction.objectStore(elementsStore.name);

        const savePromise = new Promise<CraftElement>((resolve, reject) => {
            const addRequest = elementStore.add(element);
            addRequest.onsuccess = () => {
                console.log("Element added to database!", element);
                resolve(element);
            }
            addRequest.onerror = (err) => {
                reject(err);
            }
        });
        return savePromise;
    }
    
    async getAllElements(): Promise<CraftElement[]> {
        const database = await this.open();
        const transaction = database.transaction(elementsStore.name, "readonly");
        const elementStore = transaction.objectStore(elementsStore.name);
        
        const getAllPromise = new Promise<CraftElement[]>((resolve, reject) => {
            const getAllRequest: IDBRequest<CraftElement[]> = elementStore.getAll();
            getAllRequest.addEventListener("success", (event) => {
                resolve(getAllRequest.result);
            });
            getAllRequest.addEventListener("error", (event) => {
                reject(event);
            });
        });
        return getAllPromise;
    }

    async getCombination(first: string, second: string): Promise<CraftCombination> {
        const database = await this.open();
        const transaction = database.transaction(comboStoreConfig.name, "readonly");
        const comboStore = transaction.objectStore(comboStoreConfig.name);
        const ids = [first, second].sort();
        const getPromise = new Promise<CraftCombination>((resolve, reject) => {
            const getRequest: IDBRequest<CraftCombination> = comboStore.get(ids);
            getRequest.addEventListener("success", (event) => {
                resolve(getRequest.result);
            });
            getRequest.addEventListener("error", (event) => {
                reject(event);
            });
        });
        return getPromise;
    }

    async saveCombination(combo: CraftCombination): Promise<CraftCombination> {
        const database = await this.open();
        const transaction = database.transaction(comboStoreConfig.name, "readwrite");
        const comboStore = transaction.objectStore(comboStoreConfig.name);
        sortCombination(combo);
        const savePromise = new Promise<CraftCombination>((resolve, reject) => {
            const saveRequest = comboStore.add(combo);
            saveRequest.addEventListener("success", (event) => {
                resolve(combo);
            });
            saveRequest.addEventListener("error", (event) => {
                reject(event);
            });
        });
        return savePromise;
    }
}