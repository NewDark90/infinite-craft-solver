import { CraftDatabase } from "./database.interface";

export class DatabaseManager {

    constructor() {

    }

    async importElements(target: CraftDatabase, other: CraftDatabase) {
        const otherElements = await other.getAllElements();

        for (const otherElement of otherElements) {
            const foundElement = await target.getElement(otherElement.text);
            if (foundElement) {
                continue;
            }
            await target.saveElement({
                ...otherElement,
                createdStamp: Date.now()
            });
        }
    }

    async syncElements(first: CraftDatabase, second: CraftDatabase) {
        await this.importElements(first, second);
        await this.importElements(second, first);
    }

    async importCombinations(target: CraftDatabase, other: CraftDatabase) {
        const otherCombos = await other.getAllCombinations();

        for (const otherCombo of otherCombos) {
            const foundCombo = await target.getCombination(otherCombo.first, otherCombo.second);
            if (foundCombo) {
                continue;
            }
            await target.saveCombination({
                first: otherCombo.first,
                second: otherCombo.second,
                result: {...otherCombo.result},
                createdStamp: Date.now()
            });
        }
    }

    async syncCombinations(first: CraftDatabase, second: CraftDatabase) {
        await this.importCombinations(first, second);
        await this.importCombinations(second, first);
    }

}