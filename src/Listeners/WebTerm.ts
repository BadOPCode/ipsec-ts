import fs from "fs";
import path from "path";
import sock from "socket.io";
import { Duplex } from "stream";
import iconv from "iconv-lite";

import { WebBase, WebBaseSetting } from "../Net/WebBase";


export interface WebTermSettings extends WebBaseSetting {
    requestPattern: string;
}

interface WebClient extends Duplex {
    remoteAddress?: string;
}
export class WebTerm extends WebBase {
    protected settings: WebTermSettings;
    protected io: sock.Server;
    private _buffer: WebClient = new Duplex();

    constructor(settings: WebTermSettings) {
        super(settings);
        this.settings = settings;
        this.io = require('socket.io')(this.httpServer);

        this.io.on('connection', (socket: sock.Socket)  => {
            this._buffer = new Duplex({
                write(chunk, encoding, next) {
                    socket.emit('term', iconv.decode(chunk, 'CP437'));
                    next();
                },
                read(size) {
                }
            });
            this._buffer.remoteAddress = socket.client.request.connection.remoteAddress;

            this.handle('connection', this._buffer);

            socket.on('term', (data: any)=>{
                this._buffer.push(data);
            });

            socket.on('error', (err: Error) => console.error(`Error in socket:`, err));
        });
        
        this.map('get', '/js/webterm.js', (request, response) => {
            const content = fs.readFileSync(path.resolve(__dirname, '..', 'browser/webterm.js'));
            response.setHeader('Content-Type', 'text/javascript');
            response.end(content.toString());
        });

        this.map('get', '/css/webterm.css', (request, response) => {
            const content = fs.readFileSync(path.resolve(__dirname, '..', 'browser/webterm.css'));
            response.setHeader('Content-Type', 'text/css');
            response.end(content.toString());
        });

        this.map('get', this.settings.requestPattern, (request, response) => {
            response.end(this.returnHtml());
        });
    }

    private returnHtml() {
        return `
            <html>
              <head>
                  <link rel="stylesheet" href="/css/webterm.css" />
              </head>
              <body>
                <div id="web-terminal" style="height:100%;"></div>
                <script src="/js/webterm.js"></script>
              </body>
            </html>
        `;
    }
}

export default (settings: WebTermSettings) => {
    return new WebTerm(settings);
}