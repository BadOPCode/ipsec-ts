export function DateToUnix(dateToConvert?: Date): number {
    if (!dateToConvert) return 0;

    return Math.floor(dateToConvert.getTime() / 1000);
}

export function UnixToDate(dateToConvert: number): Date {
    let d: Date = new Date(0);
    d.setUTCSeconds(dateToConvert);
    return d;
}

