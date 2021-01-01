import net from "net";
import { Database, OPEN_CREATE, OPEN_READWRITE, Statement } from "sqlite3";

/**
 * ConnectionRecord is the data stored in database on connections.
 */
export interface ConnectionRecord {
    ipAddress: string;
    lastConnect?: Date;
    shortConnects?: number;
    banExpiration?: Date | null;
}

/* Interface is used for interacting with database;
 */
interface ConnectionRow {
    ip_address: string;
    last_connect_time: number;
    short_connects: number;
    ban_expiration: number;
}

export class BlockManager {
    private _db: Database;
    private _errorCallback?: (err: Error) => void;
    static CONNECTION_LENGTH_THRESHOLD = 150; // 1 min.  Needs to be replaced with config.
    static DB_LOCATION = './ipsec.db';
    static CREATE_CONNECTIONS_TABLE = `
        CREATE TABLE IF NOT EXISTS connections (
            ip_address TEXT NOT NULL UNIQUE,
            last_connect_time INTEGER,
            short_connects INTEGER,
            ban_expiration INTEGER
        )`;

    constructor() {
        this._errorHandler = this._errorHandler.bind(this);
        this._db = new Database(BlockManager.DB_LOCATION, OPEN_READWRITE | OPEN_CREATE, this._errorHandler);
        this._db.run(BlockManager.CREATE_CONNECTIONS_TABLE, this._errorHandler);
    }

    public onError(errorCallback: ()=>void) {
        this._errorCallback = errorCallback;
    }

    /**
     * startConnect is called when a connection is first established.
     * @param newConnection 
     * @returns Boolean ban status on user
     */
    public async startConnect(connectionInfo: ConnectionRecord): Promise<void> {
        const query = `
            SELECT * FROM connections WHERE ip_address='${connectionInfo.ipAddress}'
        `;

        return new Promise((resolve, reject) => {
            this._db.get(query, (err, row) => {
                if (err) this._errorHandler(err);
    
                if (row) {
                    connectionInfo = this._deserialize(row);
                    if (this._processAlreadyBanned(connectionInfo)) {
                        reject();
                        console.log(`${connectionInfo.ipAddress} - rejected beccause on ban list.`);
                    } else {
                        resolve();
                        console.log(`${connectionInfo.ipAddress} - passed audit.`);
                        connectionInfo.lastConnect = new Date();
                    }
                    
                    let rowInfo = this._serailize(connectionInfo);
                    this._db.run(`
                      UPDATE connections
                      SET
                        last_connect_time=${rowInfo.last_connect_time},
                        short_connects=${rowInfo.short_connects},
                        ban_expiration=${rowInfo.ban_expiration}
                      WHERE
                        ip_address='${rowInfo.ip_address}';                    
                    `, this._errorHandler);    
                } else {
                    resolve();
                    console.log(`${connectionInfo.ipAddress} - First time seen.`);
                    connectionInfo.lastConnect = new Date();
                    connectionInfo.shortConnects = 0;
                    connectionInfo.banExpiration = null;
                    let rec = this._serailize(connectionInfo);
    
                    this._db.run(`
                        INSERT INTO connections(
                            ip_address,
                            last_connect_time,
                            short_connects,
                            ban_expiration
                        ) VALUES (
                            '${rec.ip_address}',
                            ${rec.last_connect_time},
                            ${rec.short_connects},
                            ${rec.ban_expiration}
                        )`, 
                        this._errorHandler
                    );
                }
            });    
        });
    }

    public endConnect(connectionInfo: ConnectionRecord) {
        const query = `
            SELECT * FROM connections WHERE ip_address='${connectionInfo.ipAddress}'
        `;
        this._db.get(query, (err, rowInfo) => {
            if (rowInfo.last_connect_time + BlockManager.CONNECTION_LENGTH_THRESHOLD > this._DateToUnix(new Date())) {
                console.log('Suspicious short connection time from ',connectionInfo.ipAddress);
                rowInfo.short_connects++;

                if (rowInfo.short_connects > 2) {
                    rowInfo.ban_expiration = this._DateToUnix(new Date()) + 300;
                }
            }

            this._db.run(`
                UPDATE connections
                    SET
                        last_connect_time=${rowInfo.last_connect_time},
                        short_connects=${rowInfo.short_connects},
                        ban_expiration=${rowInfo.ban_expiration}
                    WHERE
                        ip_address='${rowInfo.ip_address}';                    
            `, this._errorHandler);
        });
    }

    private _errorHandler(err?: Error | null) {
        if (!err) return;

        if (this._errorCallback) {
            this._errorCallback(err);
        } else {
            throw err;
        }
    }

    private _DateToUnix(dateToConvert?: Date): number {
        if (!dateToConvert) return 0;

        return Math.floor(dateToConvert.getTime() / 1000);
    }

    private _UnixToDate(dateToConvert: number): Date {
        let d: Date = new Date(0);
        d.setUTCSeconds(dateToConvert);
        return d;
    }

    private _serailize(record: ConnectionRecord): ConnectionRow {
        return {
            ip_address: record.ipAddress,
            last_connect_time: this._DateToUnix(record.lastConnect),
            short_connects: record.shortConnects || 0,
            ban_expiration: record.banExpiration ? this._DateToUnix(record.banExpiration) : 0,
        }
    }

    private _deserialize(record: ConnectionRow): ConnectionRecord {
        return {
            ipAddress: record.ip_address,
            lastConnect: this._UnixToDate(record.last_connect_time),
            shortConnects: record.short_connects,
            banExpiration: this._UnixToDate(record.ban_expiration),
        }
    }

    /* returns new date of ban expiration */
    private _calculateBanTime(offenseTimes: number = 1) {
        let banExp = new Date();
        let unixBan = this._DateToUnix(new Date()) + (60 * offenseTimes);
        banExp = this._UnixToDate(unixBan);
        return banExp;
    }

    private _processAlreadyBanned(rec: ConnectionRecord): boolean {
        console.log({rec});
        // user contacted system before ban has been lifted.
        if (rec.banExpiration && (new Date()).getTime() < rec.banExpiration.getTime()) {
            rec.banExpiration = this._calculateBanTime(rec.shortConnects);
            return true;
        }

        return false;
    }
}

export const blkMgr = new BlockManager();