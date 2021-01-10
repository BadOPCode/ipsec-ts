import { ConnectionSetting } from "../Config";
import { NetService } from ".";
import { Duplex } from "stream";

export interface ListenerSetting extends ConnectionSetting {
    options?: {
        onBannedConnection?: string;
        displayAuditStatus?: boolean;
    }
}

export interface ClientConnection extends Duplex {
    remoteAddress: string;
}

type ListenerCallbackStack = {
    [name: string]: (...args: any[]) => any;
    start: (startInfo?: any)=>void;
    stop: ()=>void;
    error: (err: Error)=>void;
    connection: (client: ClientConnection) => void;
}

export class Listener {
    protected isListening: boolean = false;  // status of listener
    protected startInfo?: any; // misc returned from starting listener
    protected settings: ListenerSetting;
    
    private _callbacks: ListenerCallbackStack;

    constructor(settings: ListenerSetting) {
        this.settings = settings;

        // init generic handlers
        this._callbacks = {
            start: ()=>{},
            stop: ()=>{},
            error: err=>{},
            connection: client=>{},
        }
    }

    public start() {
        this.handle('start', this.startInfo);
    }

    public stop() {
        this.handle('stop');
    }

    public on(name:string, cb: (...args: any[])=>any) {
        this._callbacks[name] = cb;
    }

    protected handle(name: string, ...args: any[]) {
        if (name === 'error') {
            console.error('ERROR:', ...args);
        }

        if (this._callbacks[name]) {
            this._callbacks[name](...args);
        }
    }

}