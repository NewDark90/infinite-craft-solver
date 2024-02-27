import { CraftElement, comboStoreConfig, elementsStoreConfig, CraftCombination, LocalStorageCraftElement, sortCombination, nothing } from "./object-stores";

export interface IDbStats {
    comboCount: number;
    elementCount: number;
    discoveryCount: number;
}

export interface CraftDatabaseConfig {
    databaseName: string;
}

const defaultElements: CraftElement[] = [
    { text: "Water", emoji: '💧', discovered: false },
    { text: "Fire", emoji: '🔥', discovered: false },
    { text: "Wind", emoji: '🌬️', discovered: false },
    { text: "Earth", emoji: '🌍', discovered: false },
]

export class CraftDatabase {

    private readonly version = 3;
    private database?: Promise<IDBDatabase>;

    private config: CraftDatabaseConfig

    constructor(
        config?: CraftDatabaseConfig
    ) {
        const defaultConfig: CraftDatabaseConfig = { 
            databaseName: 'craft-db'
        };
        this.config = {
            ...defaultConfig,
            ...config
        }
    }

    async open(): Promise<IDBDatabase> {
        if (!this.database) {
            this.database = new Promise<IDBDatabase>((resolve, reject) => {
                const openRequest = indexedDB.open(this.config.databaseName, this.version);
    
                openRequest.addEventListener("upgradeneeded", (event) => {
                    const database = openRequest.result;
                    console.log(`Upgrading database from ${event.oldVersion} to version ${event.newVersion}`);
                    if (event.oldVersion < 1) {
                         database.createObjectStore(comboStoreConfig.name, comboStoreConfig.parameters);
                         const elementStore = database.createObjectStore(elementsStoreConfig.name, elementsStoreConfig.parameters);
                         defaultElements.forEach(element => {
                            elementStore.add(element);
                         });
                    }
                    if (event.oldVersion < 2) {
                        const comboStore = openRequest.transaction!.objectStore(comboStoreConfig.name);
                        const elementStore = openRequest.transaction!.objectStore(elementsStoreConfig.name);
                        comboStore.createIndex("first", "first" satisfies keyof CraftCombination, {unique: false});
                        comboStore.createIndex("second", "second" satisfies keyof CraftCombination, {unique: false});
                        comboStore.createIndex("result", "result" satisfies keyof CraftCombination, {unique: false});
                        elementStore.createIndex("emoji", "emoji" satisfies keyof CraftElement, {unique: false});
                    }
                    if (event.oldVersion < 3) {
                        const comboStore = openRequest.transaction!.objectStore(comboStoreConfig.name);
                        const elementStore = openRequest.transaction!.objectStore(elementsStoreConfig.name);
                        comboStore.createIndex("createdStamp", "createdStamp" satisfies keyof CraftCombination, {unique: false});
                        elementStore.createIndex("createdStamp", "createdStamp" satisfies keyof CraftElement, {unique: false});
                    }
                    
                });
                openRequest.addEventListener("success", (event) => {
                    console.log('Open Database success!');
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

    getLocalStorageElements(): LocalStorageCraftElement[] {
        return JSON.parse(localStorage['infinite-craft-data']).elements;
    }

    setLocalStorageElements(elements: LocalStorageCraftElement[]){
        localStorage['infinite-craft-data'] = JSON.stringify({
            elements
        });
    }
    
    async getAllElements(): Promise<CraftElement[]> {
        const database = await this.open();
        const transaction = database.transaction(elementsStoreConfig.name, "readonly");
        const elementStore = transaction.objectStore(elementsStoreConfig.name);
        
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

    async getElement(element: string): Promise<CraftElement> {
        const database = await this.open();
        const transaction = database.transaction(elementsStoreConfig.name, "readonly");
        const elementStore = transaction.objectStore(elementsStoreConfig.name);
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
        const transaction = database.transaction(elementsStoreConfig.name, "readwrite");
        const elementStore = transaction.objectStore(elementsStoreConfig.name);

        element.createdStamp = Date.now();
        const savePromise = new Promise<CraftElement>((resolve, reject) => {
            if (element.discovered) {
                console.log(`%c NEW DISCOVERY! ${element.emoji} ${element.text}`, 'font-weight: bold; font-size: 1.5rem; color: #00FF00');
            }
            else {
                console.log(`%c New element! ${element.emoji} ${element.text}`, 'font-weight: bold; color: #5555FF');
            }
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
    
    async getAllCombinations(): Promise<CraftCombination[]> {
        const database = await this.open();
        const transaction = database.transaction(comboStoreConfig.name, "readonly");
        const comboStore = transaction.objectStore(comboStoreConfig.name);
        const getAllPromise = new Promise<CraftCombination[]>((resolve, reject) => {
            const getAllRequest: IDBRequest<CraftCombination[]> = comboStore.getAll();
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
        combo.createdStamp = Date.now();
        const savePromise = new Promise<CraftCombination>((resolve, reject) => {
            console.log(`New Combination: [${combo.first}, ${combo.second}] => ${combo.result.emoji} ${combo.result.text}`);
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

    async getStats(): Promise<IDbStats> {
        const database = await this.open();
        const transaction = database.transaction([comboStoreConfig.name, elementsStoreConfig.name], "readonly");
        const comboStore = transaction.objectStore(comboStoreConfig.name);
        const elementStore = transaction.objectStore(elementsStoreConfig.name);
        const comboCountPromise = new Promise<number>((resolve, reject) => {
            const request = comboStore.count();
            request.addEventListener("success", (event) => resolve(request.result));
            request.addEventListener("error", (err) => reject(err));
        });
        const elementCountPromise = new Promise<number>((resolve, reject) => {
            const request = elementStore.count();
            request.addEventListener("success", (event) => resolve(request.result));
            request.addEventListener("error", (err) => reject(err));
        });
        const elementDiscoveryCountPromise = new Promise<number>((resolve, reject) => {
            let discoverCount = 0;
            const request = elementStore.openCursor();
            request.addEventListener("success", (event) => {
                if (request.result) {
                    discoverCount += (request.result.value as CraftElement).discovered ? 1 : 0;
                    request.result.continue();
                    return;
                }
                resolve(discoverCount)
            });
            request.addEventListener("error", (err) => reject(err));
        });

        const [comboCount, elementCount, discoveryCount] = await Promise.all(
            [comboCountPromise, elementCountPromise, elementDiscoveryCountPromise]
        );
        return {
            comboCount,
            elementCount,
            discoveryCount
        };
    }

    async importElements(other: CraftDatabase) {
        const otherElements = await other.getAllElements();

        for (const otherElement of otherElements) {
            const foundElement = await this.getElement(otherElement.text);
            if (foundElement) {
                continue;
            }
            await this.saveElement({
                ...otherElement,
                createdStamp: Date.now()
            });
        }
    }

    async importCombinations(other: CraftDatabase) {
        const otherCombos = await other.getAllCombinations();

        for (const otherCombo of otherCombos) {
            const foundCombo = await this.getCombination(otherCombo.first, otherCombo.second);
            if (foundCombo) {
                continue;
            }
            await this.saveCombination({
                first: otherCombo.first,
                second: otherCombo.second,
                result: {...otherCombo.result},
                createdStamp: Date.now()
            });
        }
    }

    async fixComboData() {
        const allElements = await this.getAllElements();
        const elementMap = new Map<string, CraftElement>();
        allElements.forEach(el => elementMap.set(el.text, el));

        const database = await this.open();
        const transaction = database.transaction(comboStoreConfig.name, "readwrite");
        const comboStore = transaction.objectStore(comboStoreConfig.name);
        
        const promise = new Promise((resolve, reject) => {
            const cursorRequest = comboStore.openCursor();
            cursorRequest.addEventListener('success', (event) => {
                const cursor = cursorRequest.result;
                if (!cursor) {
                    resolve(undefined);
                    return;
                }
                const combo = cursor.value as CraftCombination | null; 
                const key = combo?.result?.text;
                if (typeof key === 'string') {
                    if (key === nothing.text) {
                        combo!.result = {
                            ...nothing,
                            discovered: false,
                        }
                    } else {
                        const element = elementMap.get(key);
                        if (!element) {
                            console.log(`Didn't find '${key}' in elements.`);
                            cursor.continue();
                            return;
                        }
                        combo!.result = {
                            ...element
                        }
                    }
                    const updateRequest = cursor.update(combo);
                    updateRequest.addEventListener('success', ()=> { console.log('Fixed', combo); })
                    updateRequest.addEventListener('error', ()=> { console.log('Broke', combo); })
                }
                cursor.continue();
            });
            cursorRequest.addEventListener("error", (err) => reject(err));
        });

        return promise;
    }
}