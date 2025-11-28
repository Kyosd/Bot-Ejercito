const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const fs = require("fs");

class Database {

    async init() {
        const folder = path.join(__dirname, "../data");
        const dbFile = path.join(folder, "database.sqlite");

        if (!fs.existsSync(folder)) fs.mkdirSync(folder);

        this.db = await open({
            filename: dbFile,
            driver: sqlite3.Database
        });

        // ================================================
        // SISTEMA DE HORAS (ya existente en tu bot)
        // ================================================
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS hours_active (
                user_id TEXT PRIMARY KEY,
                start INTEGER NOT NULL
            );
        `);

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS hours_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                start INTEGER NOT NULL,
                end INTEGER NOT NULL,
                duration INTEGER NOT NULL
            );
        `);

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS hours_blocked (
                user_id TEXT PRIMARY KEY
            );
        `);

        // ================================================
        // SISTEMA DE SANCIONES (NUEVO)
        // ================================================

        // Historial completo de sanciones
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sanctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                soldier_id TEXT NOT NULL,
                soldier_tag TEXT NOT NULL,
                reason TEXT NOT NULL,
                evidence TEXT,
                warning_number INTEGER NOT NULL,
                issued_by TEXT NOT NULL,
                issued_by_tag TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            );
        `);

        // Advertencias activas
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS soldier_warnings (
                soldier_id TEXT PRIMARY KEY,
                soldier_tag TEXT NOT NULL,
                warnings INTEGER NOT NULL,
                last_update INTEGER NOT NULL
            );
        `);

        // Logs del sistema de sanciones
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sanction_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                general_id TEXT NOT NULL,
                target_soldier_id TEXT,
                detail TEXT,
                timestamp INTEGER NOT NULL
            );
        `);

        console.log("[DATABASE] Base de datos inicializada correctamente.");
    }

    // Métodos universales
    get(...args) { return this.db.get(...args); }
    all(...args) { return this.db.all(...args); }
    run(...args) { return this.db.run(...args); }
}

module.exports = Database;
