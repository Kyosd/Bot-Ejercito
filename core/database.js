// core/database.js
"use strict";

const path = require("path");
const fs = require("fs");

class Database {
    constructor() {
        this.type = "sqlite"; // "postgres" o "sqlite"
        this.client = null;
        this.db = null;
    }

    async init() {
        const databaseUrl = process.env.DATABASE_URL;

        if (databaseUrl) {
            try {
                const { Pool } = require("pg");
                const isSslDisabled = process.env.DATABASE_SSL === "false";

                this.client = new Pool({
                    connectionString: databaseUrl,
                    ssl: isSslDisabled ? false : { rejectUnauthorized: false }
                });

                // Test de conexión
                await this.client.query("SELECT 1;");
                this.type = "postgres";
                console.log("[DATABASE] ✅ Conectado exitosamente a PostgreSQL (Nube/Railway). ¡Persistencia indestructible activa!");
            } catch (err) {
                console.error("[DATABASE] ⚠️ Error conectando a PostgreSQL. Haciendo fallback a SQLite local:", err.message);
                await this._initSqlite();
            }
        } else {
            console.log("[DATABASE] ℹ️ No se detectó DATABASE_URL. Iniciando en modo SQLite local.");
            await this._initSqlite();
        }

        await this._createTables();
    }

    async _initSqlite() {
        const sqlite3 = require("sqlite3");
        const { open } = require("sqlite");

        const folder = path.join(__dirname, "../data");
        const dbFile = path.join(folder, "database.sqlite");

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        this.db = await open({
            filename: dbFile,
            driver: sqlite3.Database
        });

        // Habilitar WAL mode para mayor rendimiento y resistencia a caídas
        await this.db.exec("PRAGMA journal_mode = WAL;");
        this.type = "sqlite";
        console.log("[DATABASE] ✅ Base de datos SQLite local inicializada (WAL mode activo).");
    }

    async _createTables() {
        const isPg = this.type === "postgres";
        const pkAuto = isPg ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";
        const intBig = isPg ? "BIGINT" : "INTEGER";

        // 1. SISTEMA DE HORAS
        await this.exec(`
            CREATE TABLE IF NOT EXISTS hours_active (
                user_id TEXT PRIMARY KEY,
                start ${intBig} NOT NULL,
                paused_at ${intBig} DEFAULT NULL,
                total_paused INTEGER DEFAULT 0
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS hours_sessions (
                id ${pkAuto},
                user_id TEXT NOT NULL,
                start ${intBig} NOT NULL,
                "end" ${intBig} NOT NULL,
                duration INTEGER NOT NULL
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS hours_blocked (
                user_id TEXT PRIMARY KEY,
                reason TEXT DEFAULT 'Bloqueado por Alto Mando',
                blocked_by TEXT DEFAULT NULL,
                blocked_at ${intBig} DEFAULT NULL
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS hours_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // 2. SISTEMA DE SANCIONES
        await this.exec(`
            CREATE TABLE IF NOT EXISTS sanctions (
                id ${pkAuto},
                soldier_id TEXT NOT NULL,
                soldier_tag TEXT NOT NULL,
                reason TEXT NOT NULL,
                evidence TEXT,
                warning_number INTEGER NOT NULL,
                issued_by TEXT NOT NULL,
                issued_by_tag TEXT NOT NULL,
                timestamp ${intBig} NOT NULL,
                status TEXT DEFAULT 'ACTIVE'
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS soldier_warnings (
                soldier_id TEXT PRIMARY KEY,
                soldier_tag TEXT NOT NULL,
                warnings INTEGER NOT NULL,
                last_update ${intBig} NOT NULL
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS sanction_logs (
                log_id ${pkAuto},
                action TEXT NOT NULL,
                general_id TEXT NOT NULL,
                target_soldier_id TEXT,
                detail TEXT,
                timestamp ${intBig} NOT NULL
            );
        `);

        // 3. EXPEDIENTES MILITARES (NUEVO)
        await this.exec(`
            CREATE TABLE IF NOT EXISTS soldier_profiles (
                user_id TEXT PRIMARY KEY,
                rank TEXT DEFAULT 'Recluta',
                division TEXT DEFAULT 'Infantería',
                joined_at ${intBig} DEFAULT NULL,
                medals TEXT DEFAULT '[]',
                notes TEXT DEFAULT ''
            );
        `);

        // 4. CONVOCATORIAS TÁCTICAS (NUEVO)
        await this.exec(`
            CREATE TABLE IF NOT EXISTS convocations (
                id ${pkAuto},
                message_id TEXT UNIQUE NOT NULL,
                channel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                date_text TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at ${intBig} NOT NULL,
                status TEXT DEFAULT 'OPEN'
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS convocation_attendees (
                id ${pkAuto},
                convocation_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                user_tag TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at ${intBig} NOT NULL,
                UNIQUE (convocation_id, user_id)
            );
        `);

        // 5. SISTEMA DE TICKETS (NUEVO)
        await this.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                id ${pkAuto},
                channel_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                claimed_by TEXT DEFAULT NULL,
                status TEXT DEFAULT 'OPEN',
                created_at ${intBig} NOT NULL,
                closed_at ${intBig} DEFAULT NULL,
                closed_by TEXT DEFAULT NULL
            );
        `);

        // 6. SECCIONES Y PANELES DE TICKETS PERSONALIZADOS
        await this.exec(`
            CREATE TABLE IF NOT EXISTS ticket_sections (
                id ${pkAuto},
                name TEXT NOT NULL,
                category_name TEXT DEFAULT NULL,
                panel_channel_id TEXT NOT NULL,
                panel_message_id TEXT DEFAULT NULL,
                discord_category_id TEXT DEFAULT NULL,
                role_id TEXT DEFAULT NULL,
                button_label TEXT DEFAULT 'Abrir Ticket',
                button_emoji TEXT DEFAULT '📩',
                embed_title TEXT NOT NULL,
                embed_description TEXT NOT NULL,
                embed_color TEXT DEFAULT '#2d5a27',
                embed_image TEXT DEFAULT NULL,
                embed_thumbnail TEXT DEFAULT NULL,
                created_by TEXT NOT NULL,
                created_at ${intBig} NOT NULL
            );
        `);

        // Migración suave: Agregar category_name si la tabla ya existía
        try {
            await this.exec("ALTER TABLE ticket_sections ADD COLUMN category_name TEXT DEFAULT NULL;");
        } catch (_) {}

        const profileAlters = [
            "ALTER TABLE soldier_profiles ADD COLUMN display_name TEXT DEFAULT NULL",
            "ALTER TABLE soldier_profiles ADD COLUMN plate TEXT DEFAULT NULL",
            "ALTER TABLE soldier_profiles ADD COLUMN rank_code TEXT DEFAULT NULL",
            "ALTER TABLE soldier_profiles ADD COLUMN verified_at " + intBig + " DEFAULT NULL",
            "ALTER TABLE soldier_profiles ADD COLUMN verified_by TEXT DEFAULT NULL"
        ];
        for (const sql of profileAlters) {
            try { await this.exec(sql); } catch (_) {}
        }

        await this.exec(`
            CREATE TABLE IF NOT EXISTS verification_requests (
                id ${pkAuto},
                user_id TEXT NOT NULL,
                display_name TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                created_at ${intBig} NOT NULL,
                reviewed_by TEXT DEFAULT NULL,
                reviewed_at ${intBig} DEFAULT NULL
            );
        `);

        await this.exec(`
            CREATE TABLE IF NOT EXISTS arrests (
                id ${pkAuto},
                soldier_id TEXT NOT NULL,
                soldier_tag TEXT NOT NULL,
                civilian_name TEXT NOT NULL,
                infraction_code INTEGER NOT NULL,
                infraction_label TEXT NOT NULL,
                evidence TEXT,
                notes TEXT,
                issued_by TEXT NOT NULL,
                issued_by_tag TEXT NOT NULL,
                created_at ${intBig} NOT NULL
            );
        `);

        // Migración suave: Agregar civilian_name si la tabla arrests ya existía
        try {
            await this.exec("ALTER TABLE arrests ADD COLUMN civilian_name TEXT DEFAULT 'Civil no identificado';");
        } catch (_) {}

        await this.exec(`
            CREATE TABLE IF NOT EXISTS supplies (
                id ${pkAuto},
                soldier_id TEXT NOT NULL,
                soldier_tag TEXT NOT NULL,
                supply_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                evidence TEXT,
                notes TEXT,
                logged_by TEXT NOT NULL,
                created_at ${intBig} NOT NULL
            );
        `);

        console.log("[DATABASE] Esquemas y tablas sincronizadas correctamente.");
    }

    // Adaptador de sintaxis SQL: Convierte '?' en '$1, $2...' para PostgreSQL
    _formatSql(sql) {
        if (this.type !== "postgres") return sql;
        let index = 1;
        return sql.replace(/\?/g, () => `$${index++}`);
    }

    async get(sql, params = []) {
        if (this.type === "postgres") {
            const formatted = this._formatSql(sql);
            const res = await this.client.query(formatted, params);
            return res.rows[0] || null;
        }
        return this.db.get(sql, params);
    }

    async all(sql, params = []) {
        if (this.type === "postgres") {
            const formatted = this._formatSql(sql);
            const res = await this.client.query(formatted, params);
            return res.rows || [];
        }
        return this.db.all(sql, params);
    }

    async run(sql, params = []) {
        if (this.type === "postgres") {
            const formatted = this._formatSql(sql);
            const res = await this.client.query(formatted, params);
            return {
                changes: res.rowCount,
                rowCount: res.rowCount,
                rows: res.rows
            };
        }
        return this.db.run(sql, params);
    }

    async exec(sql) {
        if (this.type === "postgres") {
            return this.client.query(sql);
        }
        return this.db.exec(sql);
    }
}

module.exports = Database;
