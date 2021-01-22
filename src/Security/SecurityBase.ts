import { ClientConnection } from "../Net/Listener";
import { ConnectionRecord, SecurityManager } from "./SecurityManager";

export interface SecurityModSettings {
    type: string;
    options?: {
        [key: string]: any;
    }
}

export class SecurityBase {
    protected client: ClientConnection;
    protected settings: SecurityModSettings;
    protected security: SecurityManager;
    protected securityInfo: ConnectionRecord;

    constructor(settings: SecurityModSettings, client: ClientConnection, security: SecurityManager) {
        this.client = client;
        this.settings = settings;
        this.security = security;
        this.securityInfo = {
            ipAddress: client.remoteAddress,
        };

        this.client.on('end', ()=>this.stop());
        this.client.on('data', (chunk)=>this.data(chunk));
        this.client.on('error', (err)=>this.error(err));

        this.start();
    }

    // decendents overwrite these
    protected start() {
        this.security.startConnect(this.securityInfo).then(securityInfo => {
            this.securityInfo = securityInfo;
        }).catch(reason => {
            this.client.end();
        });
    }
    
    protected stop() {
        this.security.endConnect(this.securityInfo);
    }

    protected data = (chunk: Buffer) => {}
    protected error = (err: Error) => {}

}

export default (settings: SecurityModSettings, client: ClientConnection, security: SecurityManager) => {
    return new SecurityBase(settings, client, security);
}
