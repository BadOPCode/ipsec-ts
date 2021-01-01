import { settings } from "cluster";
import express from "express";
import http from "http";
import https from "https";

import { Listener, ListenerSetting } from "../Net/Listener";
import { ListenerSocket } from "./Socket";
import { WebBase, WebBaseSetting } from "./WebBase";

export interface HttpRedirectSetting extends WebBaseSetting {
    redirectPattern: string;
    requestPattern: string;
}


export class ListenerHttpRedirect extends WebBase {
    protected settings: HttpRedirectSetting;
    
    constructor(settings: HttpRedirectSetting) {
        super(settings);
        this.settings = settings;
        this.map('all', this.settings.requestPattern, (request, response) => {
            const redirectStr = this.settings.redirectPattern
                .replace(/\${host}/, request.header('host') || '')
                .replace(/\${path}/, request.url);

            response.redirect(redirectStr);
        });
    }
}

export default (settings: HttpRedirectSetting) => {
    return new ListenerHttpRedirect(settings);
}