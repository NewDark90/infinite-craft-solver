import { CraftCombination, CraftElement } from "..";

export interface DatabaseCraftElement extends CraftElement {

}

export interface DatabaseCraftCombination extends Omit<CraftCombination, 'result'> {
    result: string;
}

export type FlatCombinationAndResult = Omit<DatabaseCraftCombination, 'result'> & DatabaseCraftElement & { elementCreatedDate: number};