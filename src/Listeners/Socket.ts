import net from "net";

import { Listener, ListenerSetting } from "../Net/Listener";

export class ListenerSocket extends Listener {
    private _listener: net.Server | undefined;

    constructor(settings: ListenerSetting) {
        super(settings);

        try {
            this._listener = net.createServer(this._clientHandler);
        } catch(err) {
            this.handle('error', err);
        }
    }

    public start() {
        if (!this._listener) return;

        const {address, port} = this.settings;
        this._listener.listen({
            host: address,
            port,
        }, ()=> {
            this.startInfo = <net.AddressInfo>this._listener?.address();
            super.start();
        });
    }

    public stop() {
        this._listener?.close(()=>this.handle('stop'));
    }

    private _clientHandler = (client: net.Socket) => {
        this.handle('connection', client);
    }
}

export default (settings: ListenerSetting) => {
    return new ListenerSocket(settings);
}