module.exports = {

    // --------------------------------------------------
    // OBTENER ADVERTENCIAS ACTIVAS DEL SOLDADO
    // --------------------------------------------------
    async getWarnings(bot, soldierId) {
        const row = await bot.db.get(
            "SELECT warnings FROM soldier_warnings WHERE soldier_id = ?",
            [soldierId]
        );

        return row ? row.warnings : 0;
    },

    // --------------------------------------------------
    // ACTUALIZAR CONTADOR DE ADVERTENCIAS
    // --------------------------------------------------
    async updateWarnings(bot, soldierId, soldierTag, warnings) {
        const timestamp = Date.now();

        await bot.db.run(`
            INSERT INTO soldier_warnings (soldier_id, soldier_tag, warnings, last_update)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(soldier_id) DO UPDATE SET 
                warnings = excluded.warnings,
                soldier_tag = excluded.soldier_tag,
                last_update = excluded.last_update
        `, [soldierId, soldierTag, warnings, timestamp]);
    },

    // --------------------------------------------------
    // GUARDAR SANCIÓN EN HISTORIAL
    // --------------------------------------------------
    async addSanction(bot, data) {
        await bot.db.run(`
            INSERT INTO sanctions 
            (soldier_id, soldier_tag, reason, evidence, warning_number, issued_by, issued_by_tag, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.soldier_id,
            data.soldier_tag,
            data.reason,
            data.evidence,
            data.warning_number,
            data.issued_by,
            data.issued_by_tag,
            data.timestamp
        ]);
    },

    // --------------------------------------------------
    // ÚLTIMA SANCIÓN REALIZADA
    // --------------------------------------------------
    async getLatestSanction(bot, soldierId) {
        return bot.db.get(`
            SELECT * FROM sanctions WHERE soldier_id = ?
            ORDER BY id DESC LIMIT 1
        `, [soldierId]);
    },

    // --------------------------------------------------
    // LISTA DE SOLDADOS ORDENADOS POR ADVERTENCIAS
    // --------------------------------------------------
    async getSanctionsList(bot) {
        return bot.db.all(`
            SELECT soldier_id, soldier_tag, warnings
            FROM soldier_warnings
            ORDER BY warnings DESC
        `);
    },

    // --------------------------------------------------
    // HISTORIAL COMPLETO DE UN SOLDADO
    // --------------------------------------------------
    async getHistory(bot, soldierId) {
        return bot.db.all(`
            SELECT * FROM sanctions WHERE soldier_id = ?
            ORDER BY id ASC
        `, [soldierId]);
    },

    // --------------------------------------------------
    // ELIMINAR 1 ADVERTENCIA
    // --------------------------------------------------
    async removeOneWarning(bot, soldierId) {
        const current = await this.getWarnings(bot, soldierId);

        if (current > 1) {
            await bot.db.run(`
                UPDATE soldier_warnings SET warnings = warnings - 1
                WHERE soldier_id = ?
            `, [soldierId]);
        } else {
            await bot.db.run(`
                DELETE FROM soldier_warnings WHERE soldier_id = ?
            `, [soldierId]);
        }
    },

    // --------------------------------------------------
    // ELIMINAR TODAS LAS ADVERTENCIAS
    // --------------------------------------------------
    async removeAllWarnings(bot, soldierId) {
        await bot.db.run(`
            DELETE FROM soldier_warnings WHERE soldier_id = ?
        `, [soldierId]);
    }
};
