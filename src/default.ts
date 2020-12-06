import { ServerInfo } from "./ServerProtect";

export interface ConfigInfo {
    servers: {
        listener: ServerInfo,
        target: ServerInfo,
    }[],
}

export const IPSEC_DEFAULTS = {
    servers: [],
};