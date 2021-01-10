import { ClientConnection } from "../Net/Listener";
import { DateToUnix, UnixToDate } from "../Util/TimeDate";
import { SecurityBase, SecurityModSettings } from "./SecurityBase";
import { SecurityManager } from "./SecurityManager";

export interface ShortConnectSettings extends SecurityModSettings {
    options?: {
        normalConnectionLength?: number;
        weightPerViolation?: number;
    }
}

export class ShortConnect extends SecurityBase {
    constructor(settings: ShortConnectSettings, client: ClientConnection, security: SecurityManager) {
        super(settings, client, security);

        this.settings.options = {
            normalConnectionLength: 120,
            weightPerViolation: 33,
            ...(this.settings.options || {}),
        };
    }

    start() {
        super.start();
    }

    stop() {
        const minTimeOn = DateToUnix(this.securityInfo.lastConnect) + this.settings.options?.normalConnectionLength;
        if (minTimeOn > DateToUnix(new Date())) {
            this.securityInfo.violationLevel += this.settings.options?.weightPerViolation; 
        }
        super.stop();
    }
}

export default (settings: ShortConnectSettings, client: ClientConnection, security: SecurityManager) => {
    return new ShortConnect(settings, client, security);
}