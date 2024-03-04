import { CraftApi, HttpResponseError } from "./craft-api";
import { CraftDatabase, CraftElement } from "./database/database.interface";
import { isValidElementString } from "./database/database.util";
import { IndexedDBCraftDatabase } from "./database/indexed-db/craft-database";
import { CraftStorage } from "./database/local-storage/local-storage-database";
import { delay, getRandomNumber } from "./utility";

export interface CraftManagerRunConfig {
    continue: boolean; 
    delay: number; 
    promise: Promise<any>;
}

export interface CraftManagerConfig {
    /** Change the likelihood of using some elements over others.
     *  Smaller number = more likely */
    elementSort: CraftManager['defaultElementSort'];
    /** Choose how you want to set up a "chunk" to process. */
    numberToProcess: number | ((totalElements: number) => number);
    /** Pull localStorage into IndexedDB, and sync IndexedDB back into localStorage. */
    skipSync: boolean;
}

export class CraftManager {
    #numberRegex = /^-?[0-9][0-9,\.]*$/;
    #hasNumberRegex = /[0-9]+/;

    managerConfig: CraftManagerConfig;
    private craftLocalStorage = new CraftStorage();

    constructor(
        managerConfig?: Partial<CraftManagerConfig>,
        private craftDatabase: CraftDatabase = new IndexedDBCraftDatabase(),
        private craftApi = new CraftApi()
    ) {
        this.managerConfig = this.#mergeConfig(managerConfig);
    }

    #getDefaultConfig = (): Omit<CraftManagerRunConfig, 'promise'> => {
        return {
            continue: true,
            delay: 1000,
        };
    }

    #mergeConfig(managerConfig: Partial<CraftManagerConfig> | undefined): CraftManagerConfig {
        return {
            ...{ 
                elementSort: this.defaultElementSort,
                numberToProcess: (length) => Math.max(length * 0.25, 100),
                skipSync: false,
            } satisfies CraftManagerConfig, 
            ...managerConfig
        };
    }

    #mergeUserConfig = (config: Partial<CraftManagerRunConfig> | undefined): CraftManagerRunConfig => {
        const userValues = {...config};
        config = config ?? {}; //Make sure to keep the config reference if it's there.
        return Object.assign(config, this.#getDefaultConfig(), userValues) as CraftManagerRunConfig;
    }

    private defaultElementSort = (element: CraftElement): number => {
        // Change the likelihood of using some elements over others.
        // Smaller number = more likely
        let sort = getRandomNumber(0, 1000);
        // Larger words are likely to be more gibberish. The longer, the worse.
        sort += getRandomNumber(0, element.text.length * 4);
        // If the game can't figure out what kind of emoji makes sense, it's probably a non-sense word.
        sort += getRandomNumber(0, element.emoji === '🤔' ? 250 : 0);
        // Most normal elements will have been discovered. Best to slightly de-prioritize slightly.
        sort += getRandomNumber(0, element.discovered === true ? 100 : 0);
        // Numbers combine like rabbits, and make weird combinations. 
        sort += getRandomNumber(0, this.#hasNumberRegex.test(element.text) ? 100 : 0);
        //If it's an exact match to a number, *really* deprioritize. 
        if (this.#numberRegex.test(element.text)) {
            return sort += 1000;
        }
        return sort;
    } 

    #randomizeCraftElements(elements: CraftElement[]): string[] {
        return elements
            .map(element => {
                let sort = this.managerConfig.elementSort(element);
                return { element, sort };
            })
            .filter(sortedElement => (typeof sortedElement.sort === 'number' && !Number.isNaN(sortedElement.sort)))
            .sort((a,b) => a.sort - b.sort)
            .map(sortedElement => sortedElement.element.text);
    }

    async syncLocalStorage() {
        if (this.managerConfig.skipSync || !this.craftLocalStorage.isAvailable) {
            return;
        }
        console.log("Syncing storage...");
        const localElements = this.craftLocalStorage.getLocalStorageElements();

        for (const localElement of localElements) {
            const foundElement = await this.craftDatabase.getElement(localElement.text);
            if (!foundElement) {
                await this.craftDatabase.saveElement(localElement);
            }
        }

        const allDbElements = await this.craftDatabase.getAllElements();
        this.craftLocalStorage.setLocalStorageElements(allDbElements);
        console.log("Syncing storage complete.");
    }

    solve(userConfig?: CraftManagerRunConfig): CraftManagerRunConfig {
        const config = this.#mergeUserConfig(userConfig);

        config.promise = new Promise(async (resolve, reject) => {
            try {
                let hasBeenRejected = false;
                await this.syncLocalStorage();
                while(config.continue) {
                    const allElements = await this.craftDatabase.getAllElements();
                    const numberToProcess = typeof this.managerConfig.numberToProcess === 'function' ?
                        this.managerConfig.numberToProcess(allElements.length) : 
                        this.managerConfig.numberToProcess;
                    const firstIds = this.#randomizeCraftElements(allElements).slice(0, numberToProcess);
                    const secondIds = this.#randomizeCraftElements(allElements).slice(0, numberToProcess);
                    for(let i = 0; i < Math.min(firstIds.length, secondIds.length); i++) {
                        if (!config.continue) 
                            break;
                        const firstId = firstIds[i];
                        const secondId = secondIds[i];

                        const elementFromCombo = await this.ensureElementFromCombinations(firstId, secondId);
                        if (elementFromCombo) {
                            continue;
                        }

                        this.solveSingle(firstId, secondId).catch((err: Error) => {
                            if (err instanceof DOMException) {
                                //Api hit timed out, it's fine.
                                return; 
                            }
                            
                            if (!hasBeenRejected) {
                                config.continue = false;
                                hasBeenRejected = true;
                                reject(err);
                            }
                        });
                        await delay(config.delay); 
                    }
                }
                console.log("Stopping...");
                await this.syncLocalStorage();
                resolve(true);
            }
            catch(err) {
                reject(err);
            }
        });

        config.promise.catch(async (err) => {
            console.error(err);
            if (err instanceof HttpResponseError && err.response.status === 429) {
                const delayBump = 250;
                config.delay += 250;
                console.log(`Too many requests! Bumping the delay by ${delayBump}ms to ${config.delay}ms`);
                const retryAfter = parseInt(err.response.headers.get('retry-after') ?? "300") + 30;
                await delay(retryAfter * 1000);
                config.continue = true;
                this.solve(config);
            }
        });
        config.promise.finally(() => console.log("Stopped"));

        return config;
    }

    solveFor(id: string, userConfig?: CraftManagerRunConfig): CraftManagerRunConfig {
        const config = this.#mergeUserConfig(userConfig);

        config.promise = new Promise(async (resolve, reject) => {
            try {
                await this.syncLocalStorage();
                const firstElement = await this.craftDatabase.getElement(id);
                if (!firstElement) {
                    throw Error(`${id} doesn't exist`);
                }
                const allElements = await this.craftDatabase.getAllElements();
                const firstId = firstElement.text;
                const secondIds = this.#randomizeCraftElements(allElements);
                while(config.continue) {
                    for (const secondId of secondIds) {
                        if (!config.continue) 
                            break;

                        const elementFromCombo = await this.ensureElementFromCombinations(firstId, secondId);
                        if (elementFromCombo) {
                            continue;
                        }

                        let hasBeenRejected = false;
                        this.solveSingle(firstId, secondId).catch((err: Error) => {
                            if (err instanceof DOMException) {
                                //Api hit timed out, it's fine.
                                return; 
                            }
                            
                            if (!hasBeenRejected) {
                                config.continue = false;
                                reject(err);
                            }
                        });
                        await delay(config.delay)
                    }
                }
                console.log("Stopping...");
                await this.syncLocalStorage();
                resolve(true);
            }
            catch(err) {
                reject(err);
            }
        });
        config.promise.finally(() => console.log("Stopped"));

        return config as CraftManagerRunConfig;
    }

    private async ensureElementFromCombinations(firstId: string, secondId: string) {
        const foundCombo = await this.craftDatabase.getCombination(firstId, secondId);

        if (foundCombo) {
            let foundElement = await this.craftDatabase.getElement(foundCombo.result.text);
            if (foundElement) {
                console.log(`%c Skipping ${firstId}, ${secondId}`, 'font-size: 0.7rem; color: #888888');
            } else {
                console.log(`%c Saving from combination ${firstId}, ${secondId}`, 'font-size: 0.8rem; color: #AAAAAA');
                foundElement = {
                    ...foundCombo.result,
                    createdStamp: Date.now()
                }
                await this.craftDatabase.saveElement(foundElement);
            }

            return foundElement;
        }
    }

    private async solveSingle(firstId: string, secondId: string) {
        const comboResult = (await this.craftApi.pair(firstId, secondId)).data;
        const elementResult = {
            text: comboResult.result,
            discovered: comboResult.isNew,
            emoji: comboResult.emoji,
            createdStamp: Date.now()
        } satisfies CraftElement;

        if (isValidElementString(comboResult.result)) {
            const resultElement = await this.craftDatabase.getElement(comboResult.result);
            if (!resultElement) {
                await this.craftDatabase.saveElement(elementResult);
            }
        }

        await this.craftDatabase.saveCombination({
            first: firstId,
            second: secondId,
            result: elementResult,
            createdStamp: Date.now()
        });
    }
}