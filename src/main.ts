import { CraftDatabase } from "./craft-database";

const main = () => {
    (globalThis as any).run = () => {
        const craftDatabase = new CraftDatabase();
        craftDatabase.init();
    }
};

main();