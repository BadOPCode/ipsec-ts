import json5 from "json5";
import fs from "fs";

import defaults from "./defaults";
import { ListenerSetting } from "../Net/Listener";
import { TargetSetting } from "../Net/Target";

export interface ConnectionSetting {
    type?: string;
    port?: number;
    address?: string;
}

export type SecuritySetting = string | {
    type: string,
    options?: {
        [key: string]: any,
    },
};

export interface SwitchSetting {
    listener: ListenerSetting,
    target?: TargetSetting,
    security?: SecuritySetting[],
}

export interface ConfigInfo {
    switches: SwitchSetting[],
}

export const configData: ConfigInfo = {
    ...defaults,
    ...(
        fs.existsSync('./setup.json5') ? 
            json5.parse(fs.readFileSync('./setup.json5').toString()) : {}
    ),
}

export default configData;
