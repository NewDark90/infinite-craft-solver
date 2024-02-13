import { comboStoreConfig } from "./combo-store.config";
import { CraftElement, elementsStore } from "./elements-store.config";




export class CraftDatabase {

    private readonly version = 1;
    private readonly databaseName = "craft-db"
    private database?: IDBDatabase;

    constructor(

    ) {

    }

    init() {
        const openRequest = indexedDB.open(this.databaseName, this.version);

        openRequest.addEventListener("upgradeneeded", (event) => {
            this.database = openRequest.result;
            this.database.createObjectStore(comboStoreConfig.name, comboStoreConfig.parameters);
            this.database.createObjectStore(elementsStore.name, elementsStore.parameters);
        }) ;
        openRequest.addEventListener("success", (event) => {
            console.log('running onsuccess');
            this.database = openRequest.result;
            this.syncStorage();
        });
        openRequest.addEventListener("error", (event) => {
            console.error(event);
        });
    }

    getLocalStorageElements(): CraftElement[] {
        return JSON.parse(localStorage['infinite-craft-data']).elements;
    }

    setLocalStorageElements(elements: CraftElement[]){
        localStorage['infinite-craft-data'] = JSON.stringify({
            elements
        });
    }

    private async syncStorage() {
        const allPromises: Promise<any>[] = []
        const localElements = this.getLocalStorageElements();

        const transaction = this.database!.transaction(elementsStore.name, "readwrite");
        const elementStore = transaction.objectStore(elementsStore.name);

        for (const localElement of localElements) {
            const getPromise = new Promise<{ localElement: CraftElement, foundResult?: CraftElement}>(
                (resolve, reject) => {
                    const getRequest: IDBRequest<CraftElement> = elementStore.get(localElement.text);
                    getRequest.onsuccess = (_event) => {
                        resolve({
                            localElement: localElement,
                            foundResult: getRequest.result
                        });
                    };
                    getRequest.onerror = (event) => {
                        console.error(event);
                        reject(event);
                    };
                }
            ).then(({localElement, foundResult}) => {
                const savePromise = new Promise<CraftElement>((resolve, reject) => {
                    if (!foundResult) {
                        const addRequest = elementStore.add(localElement);
                        addRequest.onsuccess = () => {
                            resolve(localElement);
                        }
                        addRequest.onerror = (err) => {
                            reject(err);
                        }
                    }
                    else {
                        resolve(localElement);
                    }
                });
                return savePromise;
            });

            allPromises.push(getPromise);
        }

        await Promise.all(allPromises);
    }
}