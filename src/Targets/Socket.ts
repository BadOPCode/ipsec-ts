import net from "net";
import { Duplex } from "stream";
import { Target, TargetSetting } from "../Net/Target";

export class TargetSocket extends Target {
    private _socket: net.Socket;

    constructor(settings: TargetSetting) {
        super(settings);

        const {address,port} = settings;
        this._socket = net.createConnection({
            host: address,
            port
        });
        this._socket.on('close', (hadError:boolean)=>this.handle('close', hadError));
        this._socket.on('error', (err: Error)=>this.handle('error', err));
        this._socket.on('data', (data:Buffer)=>this.handle('data', data));
        this._socket.on('connect', ()=>this.handle('started'));
    }

    public stop = () => {
        this._socket.end();
    }

    public setPipe = (listener: Duplex) => {
        console.log('Pipe set');
        listener.pipe(this._socket);
        this._socket.pipe(listener);
    }
}

export default (settings: TargetSetting) => {
    console.log(`Creating new raw socket to ${settings.address} on port ${settings.port}`)
    return new TargetSocket(settings);
}