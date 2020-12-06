import net from "net";
import { blkMgr, ConnectionRecord } from "./BlockManager";
import { SoupShell } from "./SoupShell";

export interface ServerInfo {
    port: number;
    host?: string;
}

/**
 * ServerProtect sets a listner object that proxies a connection
 * to the real server to 
 */
export class ServerProtect {
    public target: ServerInfo;
    private _listen: ServerInfo;
    private _info?: net.AddressInfo;
    private _isRunning: boolean;
    private _server: net.Server;
    private _closeCallback?: ()=>void | null;
    private _errorCallback?: (err: Error)=>void | null;

    constructor(listen: ServerInfo, target: ServerInfo) {
        this._listen = listen;
        this.target = target;
        this._server = net.createServer(this.clientHandler);
        this._isRunning = false;
        this.clientHandler = this.clientHandler.bind(this);
    }

    public start() {
        this._server.listen(this._listen, () => {
            this._info = <net.AddressInfo>this._server.address();
            this._server.on('close', this._handleClose);
            this._server.on('error', this._handleError);
            this._isRunning = true;
            console.log('Listening server:', this._info);
        });
    }

    public stop() {
        this._server.close(() => {
            this._isRunning = false;
        });
    }

    public OnClose(closeCallback: ()=>void) {
        this._closeCallback = closeCallback;
    }

    public OnError(errorCallback: (err: Error)=>void) {
        this._errorCallback = errorCallback;
    }

    public get info(): net.AddressInfo | undefined {
        return this._info;
    }

    public get listener(): ServerInfo {
        return this._listen;
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }

    private _handleClose() {
        if (this._closeCallback)
            this._closeCallback();
    }

    private _handleError(err: Error) {
        if (this._errorCallback) {
            this._errorCallback(err);
        } else {
            throw err;
        }
    }

    private clientHandler = (client: net.Socket) => {
        client.write('IPSec audit... ');

        const connectionInfo: ConnectionRecord = {
            ipAddress: client.remoteAddress || '',
        };

        blkMgr.startConnect(connectionInfo)
            .then(() => {
                client.write(' PASSED.\r')    
                const protectedServer = net.createConnection(this.target);
                // protectedServer.setEncoding("utf-8");
                // protectedServer.on("data", client.write);
                protectedServer.on("end", client.end);
                protectedServer.on("error", this._handleError);

                // client.on("data", protectedServer.write);
                client.on("end", protectedServer.end);
                client.on("error", this._handleError);
                // client.setEncoding("utf-8");
                client.on("close", (hadError:boolean) => {
                    if (!hadError)
                        blkMgr.endConnect(connectionInfo);
                    console.log('closed - errors:',hadError);
                });

                protectedServer.pipe(client);
                client.pipe(protectedServer);

                console.log('new connection:', client.address());
            })
            .catch(() => {
                client.write(' FAILED.\r');
                new SoupShell(client);
            });
    }
}