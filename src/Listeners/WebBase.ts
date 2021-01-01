//Web base class
import express, { Application } from "express";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";

import { Listener, ListenerSetting } from "../Net/Listener";

export interface WebBaseSetting extends ListenerSetting {
    protocol: 'http' | 'https';
    security?: {
        key: string;
        cert: string;
        ca?: string;
    }
}

export type WebApp  = (
    request: { 
        header: (arg0: string) => any; 
        url: string; 
    }, 
    response: { 
        end: (arg?:string) => void;
        redirect: (arg0: string) => void;
        setHeader: (arg0: string, arg1: string | string[]) => void;
        write: (arg:string) => void}
) => any;

type PathParams = string | RegExp | Array<string | RegExp>;
type HttpMethods = 'all' | 'get' | 'post' | 'delete' | 'patch' | 'put';

const webServices: {[key: string]: http.Server | https.Server } = {};
const webApps: {[key: string]: express.Application} = {};

export class WebBase extends Listener {
    protected httpServer?: http.Server | https.Server;
    protected webApp?: express.Application | {[key : string]: (request: any, response: any)=>void};
    protected settings: WebBaseSetting;

    constructor(settings: WebBaseSetting) {
        super(settings);
        this.settings = settings;
        this._initServer();
    }

    public start() {
        this.httpServer?.listen(Number(this.settings.port), String(this.settings.address), () => {
            console.log(`HTTP service listening on port ${this.settings.port}`);
        });
    }

    public stop() {
        this.httpServer?.close();
    }

    public map(method: HttpMethods, requestPattern: PathParams, responseHandler: express.Application | WebApp) {
        if (!this.webApp) return;
        this.webApp[method](requestPattern, <Application>responseHandler);
    }

    private _initServer() {
        if (!this.settings.port) {
            if (this.settings.protocol === 'https') {
                this.settings.port = 443;
            } else {
                this.settings.port = 80;
            }
        }
        const appKey = `${this.settings.address}-${this.settings.port}`;

        // add app to stack
        if (!webApps[appKey]) {
            webApps[appKey] = express();
        }
    
        // add service to stack
        if (!webServices[appKey]) {
            if (this.settings.protocol === 'https') {
                const options = {
                    key: fs.readFileSync(path.join(__dirname, '../..', String(this.settings.security?.key))),
                    cert: fs.readFileSync(path.join(__dirname, '../..', String(this.settings.security?.cert))),
                    ca: this.settings.security?.ca ? fs.readFileSync(path.join(__dirname, '../..', String(this.settings.security?.ca))) : undefined,
                };

                webServices[appKey] = https.createServer(options, webApps[appKey]);
            } else {
                const options = {};
                webServices[appKey] = http.createServer(options, webApps[appKey]);
            }
        }

        // bind properties to stacks
        this.webApp = webApps[appKey];
        this.httpServer = webServices[appKey];
    }
}
