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

    #timeout = 1000 /*ms*/ * 60 /*sec*/ * 5 /*min*/;

    constructor() {
        
    }

    async pair(first: string, second: string): Promise<{ response: Response, data: ApiResult }> {
        const ids = [first, second].sort();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.#timeout);
        const request: Request = new Request(
            `https://neal.fun/api/infinite-craft/pair?first=${encodeURIComponent(ids[0])}&second=${encodeURIComponent(ids[1])}`,
            {
                method: "GET",
                signal: controller.signal,
            }
        );
        const response = await fetch(request);
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.log(request);
            console.log(response);
            console.error(await response.text());
            throw new HttpResponseError(response);
        }

        const data: ApiResult = await response.json();

        return {
            response, 
            data
        };
    }
}