import { delay } from "./utility";

export class TimeframeSleeper {

    #startTime: number;
    #endTime?: number;

    #promise?: Promise<void>;

    constructor(
        private timeframeMilliseconds: number,
    ) {
        this.#startTime = Date.now();
    }

    async wait() {
        if (!this.#promise) {
            this.#endTime = Date.now();
            const elapsedTime = this.#endTime - this.#startTime;
            const waitTime = Math.max(this.timeframeMilliseconds - elapsedTime, 0);

            this.#promise = delay(waitTime);
        }
        
        return this.#promise;
    }

    static async run(
        timeframeMilliseconds: number, 
        promise: Promise<void> | (() => Promise<void>) 
    ) {
        if (typeof promise === 'function') {
            promise = promise();
        }
        const sleeper = new TimeframeSleeper(timeframeMilliseconds);
        await promise;
        await sleeper.wait();
    }

}