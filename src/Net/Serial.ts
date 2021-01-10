import SerialPort from "serialport";
import { Duplex } from "stream";

export interface SerialSettings {
    port: string;
    baudRate?: number;
    dataBits?: 8 | 7 | 6 | 5;
    parity?: "none" | "even" | "mark" | "odd" | "space";
    stopBits?: 1 | 2;
}

type SerialCallbackStack = {
    [name: string]: (...args: any[]) => any;
    start: (startInfo?: any)=>void;
    stop: ()=>void;
    error: (err: Error)=>void;
}

export class SerialBase {
    private _port: SerialPort;
    private _callbacks: SerialCallbackStack;
    protected startInfo?: any;
    protected settings?: SerialSettings;
    
    constructor(settings: SerialSettings) {
        this.settings = settings;
        this._port = new SerialPort(settings.port, {
            baudRate: settings.baudRate,
            dataBits: settings.dataBits,
            parity: settings.parity,
            stopBits: settings.stopBits,
            autoOpen: false,
        });

        // init generic handlers
        this._callbacks = {
            start: ()=>{},
            stop: ()=>{},
            error: err=>{},
        };
    }

    public start() {
        this._port.open(err => {
            if (err) {
                return console.error(`Error opening serial port ${this.settings?.port}:`, err.message);
            }
            this.handle('start', this.startInfo);
        });
    }

    public stop() {
        this._port.close(err => {
            if (err) {
                return console.error(`Error closing serial port ${this.settings?.port}:`, err.message);
            }
            this.handle('stop');
        });
    }

    public on(name:string, cb: (...args: any[])=>any) {
        this._callbacks[name] = cb;
    }

    protected handle(name: string, ...args: any[]) {
        if (this._callbacks[name]) {
            this._callbacks[name](...args);
        }
    }
}
