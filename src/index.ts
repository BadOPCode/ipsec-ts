import fs from "fs";
import path from "path";
import { Duplex } from "stream";
import config, { SecuritySetting, SwitchSetting } from "./Config";
import { ClientConnection } from "./Net/Listener";
import { ConnectionRecord, SecurityManager } from "./Security/SecurityManager";

const findModulePath = (modType: string, fileName: string): string => {
    let foundModule: string = '';
    if (fs.existsSync(path.join(".", modType, `${fileName}.js`))) {
        foundModule = path.join(".", modType, `${fileName}.js`);
    } else if (fs.existsSync(path.join(__dirname, modType, `${fileName}.js`))) {
        foundModule = path.join(__dirname, modType, `${fileName}.js`);
    }
    return foundModule;
};

const loadSecurityModules = (securityInfo: SecuritySetting[], client: ClientConnection, security: SecurityManager) => {
    securityInfo.forEach(secInfo => {
        if (typeof secInfo === 'string') {
            const foundSecMod = findModulePath("Security", String(secInfo));
            import(foundSecMod).then(SecMod => {
                SecMod.default({type:secInfo}, client, security);
            });
        } else {
            const foundSecMod = findModulePath("Security", String(secInfo.type));
            import(foundSecMod).then(SecMod => {
                SecMod.default(secInfo, client, security);
            });
        }
    });
}

const manager = (switchSetup:SwitchSetting) => {
    const listenerModule = findModulePath("Listeners", String(switchSetup.listener.type));
    const targetModule = findModulePath("Targets", String(switchSetup.target?.type));
    const security = new SecurityManager();

    console.log(`listenerModule: ${listenerModule}  targetModule: ${targetModule}`);

    if(listenerModule !== '') {
        import(listenerModule).then(listner => {
            const service = listner.default(switchSetup.listener);

            if (targetModule !== '') { // listeners with target services
                import(targetModule).then(target => {
                    service.on('connection', (clientCon: ClientConnection) => {
                        console.log(`Connection detected from ${clientCon.remoteAddress}...`);
                        if (switchSetup.security)
                            loadSecurityModules(switchSetup.security, clientCon, security);
                        const targetCon = target.default(switchSetup.target);
                        targetCon.on('error', (err: Error)=>console.error(err));
                        targetCon.on('start', () => {
                            targetCon.setPipe(clientCon);
                        });
                        targetCon.on('stop', () => {
                            clientCon.end();
                        });
                    });
                });
            }
            
            service.on('error', (err: Error)=>console.error(err));
            service.start();
        });
    }
};

if (config.switches) {
    config.switches.forEach(manager);
} else {
    console.log('No switches defined.');
}
