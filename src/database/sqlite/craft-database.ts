

import { AsyncDatabase } from "promised-sqlite3";
import { nameof } from "../../utility";
import { CraftCombination, CraftDatabase, CraftElement } from "../database.interface";
import { DatabaseCraftCombination, DatabaseCraftElement, FlatCombinationAndResult } from "./sqlite.interface";
import { defaultElements } from "../database.util";


export interface SqliteCraftDatabaseConfig {
    databasePath: string;
}

export class SqliteCraftDatabase implements CraftDatabase {
    #version = 1;
    #elementTable = "elements";
    #combinationTable = "combinations";
    #initPromise: Promise<void> | null = null; 
    private config: SqliteCraftDatabaseConfig;

    constructor(
        config?: Partial<SqliteCraftDatabaseConfig>
    ) {
        const defaultConfig: SqliteCraftDatabaseConfig = { 
            databasePath: 'infinite-craft.db'
        };
        this.config = {
            ...defaultConfig,
            ...config
        }
    }

    private async useDb<T = unknown>(fn: (database: AsyncDatabase) => Promise<T>) {
        const database = await AsyncDatabase.open(this.config.databasePath);
        try {
            if (!this.#initPromise) {
                this.#initPromise = this.initDb(database);
            }
            await this.#initPromise;
            return await fn(database);
        }
        finally {
            await database.close();
        }
    }

    private async initDb(database: AsyncDatabase) {
        const pragma = await database.get<{user_version: number}>(`PRAGMA user_version;`);
        if (pragma.user_version < 1) {
            const createElementTableSql = `
                CREATE TABLE IF NOT EXISTS ${this.#elementTable} (
                    ${nameof<DatabaseCraftElement>('text')} TEXT NOT NULL,
                    ${nameof<DatabaseCraftElement>('emoji')} TEXT NULL,
                    ${nameof<DatabaseCraftElement>('discovered')} BOOLEAN NOT NULL CHECK (${nameof<DatabaseCraftElement>('discovered')} IN (0, 1)) DEFAULT (0),
                    ${nameof<DatabaseCraftElement>('createdStamp')} INTEGER NOT NULL,
                    PRIMARY KEY(${nameof<DatabaseCraftElement>('text')})
                );
                CREATE INDEX ix_${this.#elementTable}_${nameof<DatabaseCraftElement>('createdStamp')} ON ${this.#elementTable} (${nameof<DatabaseCraftElement>('createdStamp')});
            `;
            await database.run(createElementTableSql);

            const createCombinationTableSql = `
                CREATE TABLE IF NOT EXISTS ${this.#combinationTable} (
                    ${nameof<DatabaseCraftCombination>('first')} TEXT NOT NULL,
                    ${nameof<DatabaseCraftCombination>('second')} TEXT NOT NULL,
                    ${nameof<DatabaseCraftCombination>('result')} TEXT NOT NULL,
                    ${nameof<DatabaseCraftCombination>('createdStamp')} INTEGER NOT NULL,
                    PRIMARY KEY(${nameof<DatabaseCraftCombination>('first')}, ${nameof<DatabaseCraftCombination>('second')}),
                    FOREIGN KEY(${nameof<DatabaseCraftCombination>('first')}) REFERENCES ${this.#elementTable}(${nameof<DatabaseCraftElement>('text')}),
                    FOREIGN KEY(${nameof<DatabaseCraftCombination>('second')}) REFERENCES ${this.#elementTable}(${nameof<DatabaseCraftElement>('text')}),
                    FOREIGN KEY(${nameof<DatabaseCraftCombination>('result')}) REFERENCES ${this.#elementTable}(${nameof<DatabaseCraftElement>('text')})
                );
                CREATE INDEX ix_${this.#combinationTable}_${nameof<DatabaseCraftCombination>('result')} ON ${this.#combinationTable} (${nameof<DatabaseCraftCombination>('result')});
                CREATE INDEX ix_${this.#combinationTable}_${nameof<DatabaseCraftCombination>('createdStamp')} ON ${this.#combinationTable} (${nameof<DatabaseCraftCombination>('createdStamp')});
            `;
            await database.run(createCombinationTableSql);

            const defaultPromises = defaultElements.map(async defaultElement => {
                const defaultInsertSql = `
                    INSERT OR IGNORE INTO ${this.#elementTable}(
                        ${nameof<CraftElement>('text')},
                        ${nameof<CraftElement>('emoji')},
                        ${nameof<CraftElement>('discovered')},
                        ${nameof<CraftElement>('createdStamp')}
                    )
                    VALUES($text,$emoji,$discovered,$createdStamp);
                `;
                await database.run(defaultInsertSql,
                    { 
                        $text: defaultElement.text,
                        $emoji: defaultElement.emoji,
                        $discovered: false,
                        $createdStamp: Date.now()
                    }
                );
            });
            await Promise.all(defaultPromises);
        }
        await database.exec(`PRAGMA user_version = ${this.#version};`);
    }
    
    async getAllElements(): Promise<CraftElement[]> {
        return await this.useDb(async (database) => {
            return await database.all<CraftElement>(`SELECT * FROM ${this.#elementTable};`)
        });
    }

    async getElement(element: string): Promise<CraftElement | undefined> {
        return await this.useDb(async (database) => {
            return (await database.get<CraftElement>(`
                SELECT * FROM ${this.#elementTable} 
                WHERE ${nameof<CraftElement>('text')} = $text;`,
                { $text: element }
            )) ?? null
        });
    }

    async saveElement(element: CraftElement) {
        if (!element) {
            return Promise.resolve(element);
        }

        element.createdStamp = Date.now();
        return await this.useDb(async (database) => {
            await database.run(`
                INSERT OR IGNORE INTO ${this.#elementTable}(
                    ${nameof<CraftElement>('text')},
                    ${nameof<CraftElement>('emoji')},
                    ${nameof<CraftElement>('discovered')},
                    ${nameof<CraftElement>('createdStamp')}
                ) 
                VALUES($text,$emoji,$discovered,$createdStamp);`,
                { 
                    $text: element.text,
                    $emoji: element.emoji,
                    $discovered: element.discovered,
                    $createdStamp: element.createdStamp
                }
            );
            if (element.discovered) {
                console.log(`%c NEW DISCOVERY! ${element.emoji} ${element.text}`, 'font-weight: bold; font-size: 1.5rem; color: #00FF00');
            }
            else {
                console.log(`%c New element! ${element.emoji} ${element.text}`, 'font-weight: bold; color: #5555FF');
            }
            return element;
        });
    }
    
    async getAllCombinations(): Promise<CraftCombination[]> {
        return await this.useDb(async (database) => {
            const results = await database.all<FlatCombinationAndResult>(`
                ${this.selectFlatCombinationSql()}
            ;`);
            return results
                .filter(result => result != null)
                .map(result => this.convertFlatCombinationToRegular(result) as CraftCombination);
        });
    }

    async getCombination(first: string, second: string): Promise<CraftCombination | undefined> {
        const ids = [first, second].sort();
        return await this.useDb(async (database) => {
            const result = await database.get<FlatCombinationAndResult>(`
                ${this.selectFlatCombinationSql()}
                WHERE 
                    ${nameof<CraftCombination>('first')} = $first AND 
                    ${nameof<CraftCombination>('second')} = $second
                ;`,
                { $first: ids[0], $second: ids[1] }
            );
            return this.convertFlatCombinationToRegular(result);
        });
    }

    private selectFlatCombinationSql() {
        return `
            SELECT 
                ${this.#combinationTable}.${nameof<DatabaseCraftCombination>("first")},
                ${this.#combinationTable}.${nameof<DatabaseCraftCombination>("second")},
                ${this.#combinationTable}.${nameof<DatabaseCraftCombination>("createdStamp")},
                ${this.#elementTable}.${nameof<DatabaseCraftElement>("text")},
                ${this.#elementTable}.${nameof<DatabaseCraftElement>("emoji")},
                ${this.#elementTable}.${nameof<DatabaseCraftElement>("discovered")},
                ${this.#elementTable}.${nameof<DatabaseCraftElement>("createdStamp")} AS ${nameof<FlatCombinationAndResult>('elementCreatedDate')}
            FROM ${this.#combinationTable} 
                LEFT OUTER JOIN ${this.#elementTable} ON ${this.#elementTable}.${nameof<DatabaseCraftElement>("text")} = ${this.#combinationTable}.${nameof<DatabaseCraftCombination>("result")}
        `;
    }

    private convertFlatCombinationToRegular(combo: FlatCombinationAndResult): CraftCombination | undefined {
        if (!combo) {
            return undefined;
        }
        return {
            first: combo.first,
            second: combo.second,
            createdStamp: combo.createdStamp,
            result: { 
                text: combo.text,
                discovered: combo.discovered,
                emoji: combo.emoji,
                createdStamp: combo.elementCreatedDate
            }
        }
    }

    async saveCombination(combo: CraftCombination): Promise<CraftCombination> {
        if (!combo) {
            return Promise.resolve(combo);
        }

        combo.createdStamp = Date.now();
        return await this.useDb(async (database) => {
            await database.run(`
                INSERT OR IGNORE INTO ${this.#combinationTable}(
                    ${nameof<CraftCombination>('first')},
                    ${nameof<CraftCombination>('second')},
                    ${nameof<CraftCombination>('result')},
                    ${nameof<CraftCombination>('createdStamp')}
                ) 
                VALUES($first,$second,$result,$createdStamp);`,
                { 
                    $first: combo.first,
                    $second: combo.second,
                    $result: combo.result.text,
                    $createdStamp: combo.createdStamp
                }
            );
            console.log(`New Combination: [${combo.first}, ${combo.second}] => ${combo.result.emoji} ${combo.result.text}`);
            return combo;
        });
    }
}