import ssh, { utils } from "ssh2";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import { Listener, ListenerSetting } from "../Net/Listener";

export interface ListenerSshSetting extends ListenerSetting {
    privateKey?: string;
    publicKey?: string;
}

export class ListenerSsh extends Listener {
    protected settings: ListenerSshSetting;
    private _listener: ssh.Server;
    private _allowedPubKey: any;

    constructor(settings: ListenerSshSetting) {
        super(settings);
        this.settings = settings;

        this._allowedPubKey = utils.parseKey(fs.readFileSync(path.join(__dirname, '../..', String(this.settings.privateKey))));

        this._listener = new ssh.Server({
            hostKeys: [
                fs.readFileSync(path.join(__dirname, '../..', String(this.settings.privateKey))),
            ]
        }, this._clientHandler);
    }

    public start() {
        if (!this._listener) return;

        const {address, port} = this.settings;
        this._listener.listen({
            host: address,
            port,
        }, ()=>{
            this.startInfo = this._listener.address();
            super.start();
        });
    }

    public stop() {
        this._listener.close(()=>this.handle('stop'));
    }

    private _clientHandler = (client: ssh.Connection, info: ssh.ClientInfo) => {
        client.on('authentication', (authCtx: ssh.AuthContext) => {
            if (authCtx.method === 'publickey') {
                const allowedPubSSHKey = this._allowedPubKey.getPublicSSH();
                
                if (authCtx.key.algo !== this._allowedPubKey.type
                    || authCtx.key.data.length !== allowedPubSSHKey.length
                    || !crypto.timingSafeEqual(authCtx.key.data, allowedPubSSHKey)
                    || (authCtx.signature && this._allowedPubKey.verify(authCtx.blob, authCtx.signature) !== true)) {
                    return authCtx.reject();
                }
            }
            authCtx.accept();
        });
        this.handle('connection', client);
    }
}

export default (settings: ListenerSshSetting) => {
    return new ListenerSsh(settings);
}
