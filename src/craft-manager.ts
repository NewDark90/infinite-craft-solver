import { CraftApi, HttpResponseError } from "./craft-api";
import { CraftDatabase } from "./craft-database";
import { CraftElement } from "./elements-store.config";
import { TimeframeSleeper } from "./timeframe-sleeper";
import { delay, getRandomNumber } from "./utility";

export interface CraftManagerRunConfig {
    continue: boolean; 
    delay: number; 
    promise: Promise<any>;
}
export interface CraftManagerInfiniteRunConfig {
    currentConfig: CraftManagerRunConfig;
}

export class CraftManager {

    #numberRegex = /^-?[0-9][0-9,\.]*$/;
    #hasNumberRegex = /[0-9]+/;

    /**
     *
     */
    constructor(
        private craftDatabase = new CraftDatabase(),
        private craftApi = new CraftApi()
    ) {

    }

    #defaultConfig = (): Pick<CraftManagerRunConfig, 'continue' | 'delay'> => {
        return {
            continue: true,
            delay: 1000,
        };
    }


    #randomizeCraftElements(elements: CraftElement[]): string[] {
        return elements
            .filter(el => !this.#numberRegex.test(el.text))
            .map(el => {
                //Smaller number = more likely
                let sort = getRandomNumber(0, 1000);
                //Change the likelihood of using some elements over others.
                // Larger words are likely to be more gibberish. The longer, the worse.
                sort += getRandomNumber(0, el.text.length * 3);
                // If the game can't figure out what kind of emoji makes sense, it's probably a non-sense word.
                sort += getRandomNumber(0, el.emoji === '🤔' ? 200 : 0);
                // Most normal elements will have been discovered. Best to slightly de-prioritize slightly.
                sort += getRandomNumber(0, el.discovered === true ? 50 : 0);
                // Numbers combine like rabbits, and make weird combinations 
                sort += getRandomNumber(0, this.#hasNumberRegex.test(el.text) ? 50 : 0);
                // I don't know if there's something with my data, or if Infinite Craft is just really likes to craft nonsense words with "Jew" in the name.
                // Either way, I want to de-prioritize it.
                sort += getRandomNumber(0, (/jew/i).test(el.text) ? 50 : 0); 
                return {
                    text: el.text,
                    sort
                };
            })
            .sort((a,b) => a.sort - b.sort)
            .map(el => el.text);
    }

    async syncStorage() {
        console.log("Syncing storage...");
        const localElements = this.craftDatabase.getLocalStorageElements();

        for (const localElement of localElements) {
            const foundElement = await this.craftDatabase.getElement(localElement.text);
            if (!foundElement) {
                await this.craftDatabase.saveElement(localElement);
            }
        }

        const allDbElements = await this.craftDatabase.getAllElements();
        this.craftDatabase.setLocalStorageElements(allDbElements);
        console.log("Syncing storage complete.");
    }

    solve(config?: CraftManagerRunConfig): CraftManagerRunConfig {
        config = config ?? this.#defaultConfig() as CraftManagerRunConfig;

        config.promise = new Promise(async (resolve, reject) => {
            try {
                let hasBeenRejected = false;
                await this.syncStorage();
                while(config!.continue) {
                    const allElements = await this.craftDatabase.getAllElements();
                    const numberToProcess = Math.max(allElements.length * 0.25, 100)
                    const firstIds = this.#randomizeCraftElements(allElements).slice(0, numberToProcess);
                    const secondIds = this.#randomizeCraftElements(allElements).slice(0, numberToProcess);
                    for(let i = 0; i < numberToProcess; i++) {
                        if (!config!.continue) 
                            break;
                        const firstId = firstIds[i];
                        const secondId = secondIds[i];

                        this.solveSingle(firstId, secondId).catch((err: Error) => {
                            if (err instanceof DOMException) {
                                //Api hit timed out, it's fine.
                                return; 
                            }
                            
                            if (!hasBeenRejected) {
                                config!.continue = false;
                                hasBeenRejected = true;
                                reject(err);
                            }
                        });
                        await delay(config!.delay)
                    }
                    //await Promise.all(promises);
                }
                await this.syncStorage();
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
                config!.delay += 250;
                console.log(`Too many requests! Bumping the delay by ${delayBump}ms to ${config!.delay}ms`);
                const retryAfter = parseInt(err.response.headers.get('retry-after') ?? "300") + 30;
                await delay(retryAfter * 1000);
                config!.continue = true;
                this.solve(config);
            }
        })

        return config;
    }

    solveFor(id: string): CraftManagerRunConfig {
        const config = this.#defaultConfig() as CraftManagerRunConfig;

        config.promise = new Promise(async (resolve, reject) => {
            try {
                await this.syncStorage();
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

                        this.solveSingle(firstId, secondId).catch((err: Error) => {
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
                        });
                        await delay(config.delay)
                    }
                    //await Promise.all(promises);
                }
                await this.syncStorage();
                resolve(true);
            }
            catch(err) {
                reject(err);
            }
        });

        return config as CraftManagerRunConfig;
    }

    private async solveSingle(firstId: string, secondId: string) {
        const foundCombo = await this.craftDatabase.getCombination(firstId, secondId);

        if (foundCombo) {
            console.log(`%c Skipping ${firstId}, ${secondId}`, 'font-size: 0.75rem; color: #888888');
            return;
        }
        
        console.log(`New combination: ${firstId}, ${secondId}...`)
        const comboResult = (await this.craftApi.pair(firstId, secondId)).data;
        await this.craftDatabase.saveCombination({
            first: firstId,
            second: secondId,
            result: comboResult.result
        });
        console.log(`Crafted ${comboResult.emoji} ${comboResult.result} - [${firstId}, ${secondId}]`);

        if (comboResult.result && comboResult.result != "Nothing") {
            const resultElement = await this.craftDatabase.getElement(comboResult.result);
            if (!resultElement) {
                if (comboResult.isNew) {
                    console.log(`%c NEW DISCOVERY! ${comboResult.emoji} ${comboResult.result}`, 'font-weight: bold; font-size: 1.5rem; color: #00FF00');
                }
                else {
                    console.log(`%c New element! ${comboResult.emoji} ${comboResult.result}`, 'font-weight: bold; color: #5555FF');
                }

                await this.craftDatabase.saveElement({
                    text: comboResult.result,
                    discovered: comboResult.isNew,
                    emoji: comboResult.emoji,
                });
            }
        }
    }
}