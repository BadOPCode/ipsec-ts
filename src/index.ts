import fs from "fs";
import path from "path";
import { Duplex } from "stream";
import config, { SwitchSetting } from "./Config";

const findModulePath = (modType: string, fileName: string): string => {
    let foundModule: string = '';
    if (fs.existsSync(path.join(".", modType, `${fileName}.js`))) {
        foundModule = path.join(".", modType, `${fileName}.js`);
    } else if (fs.existsSync(path.join(__dirname, modType, `${fileName}.js`))) {
        foundModule = path.join(__dirname, modType, `${fileName}.js`);
    }
    return foundModule;
};

const manager = (switchSetup:SwitchSetting) => {
    const listenerModule = findModulePath("Listeners", String(switchSetup.listener.type));
    const targetModule = findModulePath("Targets", String(switchSetup.target?.type));
    console.log(`listenerModule: ${listenerModule}  targetModule: ${targetModule}`);

    if(listenerModule !== '') {
        import(listenerModule).then(listner => {
            const service = listner.default(switchSetup.listener);

            if (targetModule !== '') { // listeners with target services
                import(targetModule).then(target => {
                    service.on('connection', (clientCon:Duplex) => {
                        console.log('Connection detected...');
                        const targetCon = target.default(switchSetup.target);
                        targetCon.on('error', (err: Error)=>console.error(err));
                        targetCon.on('started', ()=>{
                            targetCon.setPipe(clientCon);
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
