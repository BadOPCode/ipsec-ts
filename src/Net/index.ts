import { Socket } from "net";
import { Duplex } from "stream";

export interface NetService {
    clientHandler: (client: Duplex) => void;
}