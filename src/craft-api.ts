export interface ApiResult {
    result: string;
    emoji: string;
    isNew: boolean;
}

export class HttpResponseError extends Error {
    constructor(
        public response: Response
    ) {
        super("Http Response did not indicate success.");
    }
}

export class CraftApi {

    #timeout = 1000 * 60 * 5;

    constructor() {
        
    }

    async pair(first: string, second: string): Promise<{ response: Response, data: ApiResult }> {
        const ids = [first, second].sort();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.#timeout)
        const response = await fetch(
            `https://neal.fun/api/infinite-craft/pair?first=${encodeURIComponent(ids[0])}&second=${encodeURIComponent(ids[1])}`,
            {
                signal: controller.signal
            }
        );
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.error(response);
            throw new HttpResponseError(response);
        }

        const data: ApiResult = await response.json();

        return {
            response, 
            data
        };
    }
}