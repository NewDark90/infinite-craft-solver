export function delay<T = undefined>(time: number, value?: T) {
    return new Promise<T>(resolve => setTimeout(resolve, time, value));
}

export function getRandomNumber(min: number, max: number) {
    return Math.random() * (max - min) + min;
}