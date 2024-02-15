export function delay<T = undefined>(time: number, value?: T) {
    return new Promise<T>(resolve => setTimeout(resolve, time, value));
}