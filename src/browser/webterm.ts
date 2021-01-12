import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "./webterm.css";
import { io } from "socket.io-client"

const terminal = new Terminal({
    // fontFamily: 'Web IBM EGA 8x8',
    // fontSize: 24,
    cols: 80,
    rows: 50,
});
// terminal.setOption('fontSize', 16);

const fitAddon = new FitAddon();
terminal.loadAddon(new WebLinksAddon());
terminal.loadAddon(fitAddon);
const termElem = document.getElementById('web-terminal');
if (termElem)
    terminal.open(termElem);

fitAddon.fit();
window.addEventListener('resize', () => {
    fitAddon.fit();
});

var sock = io();

sock.on('connection', ()=>{
    terminal.write('[Connected]');
});

sock.on('term', (msg: string | Uint8Array)=>{
    terminal.write(msg);
});

terminal.onData((data)=>{
    sock.emit('term', data);
});
