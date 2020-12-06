import { blkMgr } from "./BlockManager";
import { ServerInfo, ServerProtect } from "./ServerProtect";
import json5 from "json5";
import fs from "fs";
import {ConfigInfo, IPSEC_DEFAULTS} from "./default";

let config: ConfigInfo = IPSEC_DEFAULTS;

if (fs.existsSync('./setup.json5')) {
    const data = fs.readFileSync('./setup.json5');
    config = {
        ...config,
        ...json5.parse(data.toString()),
    };    
}

config.servers.forEach(serverInfo => {
    const srv = new ServerProtect(serverInfo.listener, serverInfo.target);
    srv.OnError(err => {
        console.log({err});
    })
    srv.start();
});
