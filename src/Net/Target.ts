import { Duplex } from "stream";
import { ConnectionSetting } from "../Config";

export interface TargetSetting extends ConnectionSetting {
    port: number;
}

type TargetCallbackStack = {
    [name: string]: (...args: any[]) => any;
}

export class Target {
    protected settings: TargetSetting;
    private _callbacks: TargetCallbackStack = {};

    constructor(settings: TargetSetting) {
        this.settings = settings;
    }

    public on(name:string, cb: (...args: any[])=>any) {
        this._callbacks[name] = cb;
    }

    protected handle(name: string, ...args: any[]) {
        if (this._callbacks[name]) {
            this._callbacks[name](...args);
        }
    }

    public setPipe = (listener: Duplex) => {
        
    }

    public stop = () => {}

}