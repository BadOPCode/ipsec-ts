import net from "net";
import { Database, OPEN_CREATE, OPEN_READWRITE, Statement } from "sqlite3";
import { DateToUnix, UnixToDate } from "../Util/TimeDate";

/**
 * ConnectionRecord is the data stored in database on connections.
 */
export interface ConnectionRecord {
    ipAddress: string;
    lastConnect?: Date;
    violationLevel?: number;
    banExpiration?: Date | null;
}

/* Interface is used for interacting with database;
 */
interface ConnectionRow {
    ip_address: string;
    last_connect_time: number;
    violation_level: number;
    ban_expiration: number;
}

export class SecurityManager {
    private _db: Database;
    private _errorCallback?: (err: Error) => void;
    static CONNECTION_LENGTH_THRESHOLD = 150; // 1 min.  Needs to be replaced with config.
    static DB_LOCATION = './ipsec.db';
    static CREATE_CONNECTIONS_TABLE = `
        CREATE TABLE IF NOT EXISTS connections (
            ip_address TEXT NOT NULL UNIQUE,
            last_connect_time INTEGER,
            violation_level INTEGER,
            ban_expiration INTEGER
        )`;

    constructor() {
        this._errorHandler = this._errorHandler.bind(this);
        this._db = new Database(SecurityManager.DB_LOCATION, OPEN_READWRITE | OPEN_CREATE, this._errorHandler);
        this._db.run(SecurityManager.CREATE_CONNECTIONS_TABLE, this._errorHandler);
    }

    public onError(errorCallback: ()=>void) {
        this._errorCallback = errorCallback;
    }

    /**
     * startConnect is called when a connection is first established.
     * @param newConnection 
     * @returns Boolean ban status on user
     */
    public async startConnect(connectionInfo: ConnectionRecord): Promise<ConnectionRecord> {
        const query = `
            SELECT * FROM connections WHERE ip_address='${connectionInfo.ipAddress}'
        `;

        return new Promise((resolve, reject) => {
            this._db.get(query, (err, row) => {
                if (err) this._errorHandler(err);
    
                if (row) {
                    connectionInfo = this._deserialize(row);
                    if (this._processAlreadyBanned(connectionInfo)) {
                        reject('User is temporarily banned.');
                        console.log(`${connectionInfo.ipAddress} - rejected beccause on ban list.`);
                    } else {
                        connectionInfo = this._deserialize(row);
                        console.log(`${connectionInfo.ipAddress} - passed audit.`);
                        connectionInfo.lastConnect = new Date();
                        resolve(connectionInfo);
                    }
                    
                    let rowInfo = this._serailize(connectionInfo);
                    this._db.run(`
                      UPDATE connections
                      SET
                        last_connect_time=${rowInfo.last_connect_time},
                        violation_level=${rowInfo.violation_level},
                        ban_expiration=${rowInfo.ban_expiration}
                      WHERE
                        ip_address='${rowInfo.ip_address}';                    
                    `, this._errorHandler);    
                } else {
                    console.log(`${connectionInfo.ipAddress} - Passed. First time seen.`);
                    connectionInfo.lastConnect = new Date();
                    connectionInfo.violationLevel = 0;
                    connectionInfo.banExpiration = null;
                    resolve(connectionInfo);
                    let rec = this._serailize(connectionInfo);
    
                    this._db.run(`
                        INSERT INTO connections(
                            ip_address,
                            last_connect_time,
                            violation_level,
                            ban_expiration
                        ) VALUES (
                            '${rec.ip_address}',
                            ${rec.last_connect_time},
                            ${rec.violation_level},
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
            const rec = this._serailize(connectionInfo);
            if (rec.violation_level > 100) {
                rec.ban_expiration = DateToUnix(new Date()) + (rec.violation_level * 60);
            }

            this._db.run(`
                UPDATE connections
                    SET
                        last_connect_time=${rec.last_connect_time},
                        violation_level=${rec.violation_level},
                        ban_expiration=${rec.ban_expiration}
                    WHERE
                        ip_address='${rec.ip_address}';                    
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

    private _serailize(record: ConnectionRecord): ConnectionRow {
        return {
            ip_address: record.ipAddress,
            last_connect_time: DateToUnix(record.lastConnect),
            violation_level: record.violationLevel || 0,
            ban_expiration: record.banExpiration ? DateToUnix(record.banExpiration) : 0,
        }
    }

    private _deserialize(record: ConnectionRow): ConnectionRecord {
        return {
            ipAddress: record.ip_address,
            lastConnect: UnixToDate(record.last_connect_time),
            violationLevel: record.violation_level,
            banExpiration: UnixToDate(record.ban_expiration),
        }
    }

    /* returns new date of ban expiration */
    private _calculateBanTime(offenseTimes: number = 1) {
        let banExp = new Date();
        let unixBan = DateToUnix(new Date()) + (60 * offenseTimes);
        banExp = UnixToDate(unixBan);
        return banExp;
    }

    private _processAlreadyBanned(rec: ConnectionRecord): boolean {
        // user contacted system before ban has been lifted.
        if (rec.banExpiration && DateToUnix(new Date()) < rec.banExpiration.getTime()) {
            rec.banExpiration = this._calculateBanTime(rec.violationLevel || 33);
            return true;
        }

        return false;
    }
}

export const blkMgr = new SecurityManager();
