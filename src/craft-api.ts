export interface ApiResult {
    result: string;
    emoji: string;
    isNew: boolean;
}

export class CraftApi {
    constructor() {
        
    }

    async pair(first: string, second: string): Promise<{ response: Response, data: ApiResult }> {
        const ids = [first, second].sort();
        const response = await fetch(`https://neal.fun/api/infinite-craft/pair?first=${encodeURIComponent(ids[0])}&second=${encodeURIComponent(ids[1])}`);
        const data: ApiResult = await response.json();

        return {
            response, 
            data
        };
    }
}