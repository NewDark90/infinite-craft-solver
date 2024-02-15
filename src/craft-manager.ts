import { CraftApi } from "./craft-api";
import { CraftDatabase } from "./craft-database";
import { CraftElement } from "./elements-store.config";
import { TimeframeSleeper } from "./timeframe-sleeper";
import { delay } from "./utility";

export interface CraftManagerRunConfig {
    continue: boolean; 
    delay: number; 
}

export class CraftManager {

    /**
     *
     */
    constructor(
        private craftDatabase = new CraftDatabase(),
        private craftApi = new CraftApi()
    ) {

    }

    #defaultConfig = (): CraftManagerRunConfig => {
        return {
            continue: true,
            delay: 333,
        };
    }


    #randomizeCraftElements(elements: CraftElement[]): string[] {
        return elements
            .map(el => ({ text: el.text, sort: Math.random() }))
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

    solve(): CraftManagerRunConfig {
        const config = this.#defaultConfig();
        const pageSize = 50;

        const runner = new Promise(async (resolve, reject) => {
            try {
                while(config.continue) {
                    const promises: Promise<any>[] = [];
                    const allElements = await this.craftDatabase.getAllElements();
                    const firstIds = this.#randomizeCraftElements(allElements).slice(0, pageSize);
                    const secondIds = this.#randomizeCraftElements(allElements).slice(0, pageSize);

                    for (const firstId of firstIds) {
                        for (const secondId of secondIds) {
                            if (!config.continue) 
                                break;

                            promises.push(this.solveSingle(firstId, secondId));
                            await delay(config.delay)
                        }
                    }
                    await Promise.all(promises);
                    await this.syncStorage();
                }
                resolve(true);
            }
            catch(err) {
                reject(err);
            }
        });

        return config;
    }

    solveFor(id: string): CraftManagerRunConfig {
        const config = this.#defaultConfig();

        const runner = new Promise(async (resolve, reject) => {
            try {
                const firstElement = await this.craftDatabase.getElement(id);
                if (!firstElement) {
                    throw Error(`${id} doesn't exist`);
                }
                const allElements = await this.craftDatabase.getAllElements();
                const firstId = firstElement.text;
                const secondIds = this.#randomizeCraftElements(allElements);
                while(config.continue) {
                    const promises: Promise<any>[] = [];
                    for (const secondId of secondIds) {
                        if (!config.continue) 
                            break;

                        promises.push(this.solveSingle(firstId, secondId));
                        await delay(config.delay)
                    }
                    await Promise.all(promises);
                    await this.syncStorage();
                }
                resolve(true);
            }
            catch(err) {
                reject(err);
            }
        });

        return config;
    }

    private async solveSingle(firstId: string, secondId: string) {
        try {
            const foundCombo = await this.craftDatabase.getCombination(firstId, secondId);

            if (!foundCombo) {
                console.log(`New combination: ${firstId}, ${secondId}...`)
                const comboResult = (await this.craftApi.pair(firstId, secondId)).data;
                await this.craftDatabase.saveCombination({
                    first: firstId,
                    second: secondId,
                    result: comboResult.result
                });
                console.log(`Crafted ${comboResult.emoji} ${comboResult.result}...`);

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
        } catch(err) {
            console.error(err);
        }
    }
}