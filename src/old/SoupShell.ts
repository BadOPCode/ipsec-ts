import net from "net";

export class SoupShell {
    constructor (client: net.Socket) {
        client.write('\r\nroot:/# ');
        client.on("data", (data) => {
            client.write(data);
            if (data.toString().match(/\r/))
                client.write('NO SOUP FOR YOU!\r\nroot:/# ');
        });
    }
}