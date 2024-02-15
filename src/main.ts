import { CraftManager } from "./craft-manager";

const main = () => {
    const craftManager = new CraftManager();
    (globalThis as any).craftManager = craftManager;
};

main();