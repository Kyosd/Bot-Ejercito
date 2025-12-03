// modules/sanctions/service.js
module.exports = {
    async getWarnings(bot, soldierId) {
        const row = await bot.db.get(
            "SELECT warnings FROM soldier_warnings WHERE soldier_id = ?",
            [soldierId]
        );
        return row ? row.warnings : 0;
    },

    async updateWarnings(bot, soldierId, soldierTag, warnings) {
        const timestamp = Date.now();

        await bot.db.run(
            `
            INSERT INTO soldier_warnings (soldier_id, soldier_tag, warnings, last_update)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(soldier_id) DO UPDATE SET 
                warnings = excluded.warnings,
                soldier_tag = excluded.soldier_tag,
                last_update = excluded.last_update
        `,
            [soldierId, soldierTag, warnings, timestamp]
        );
    },

    async addSanction(bot, data) {
        await bot.db.run(
            `
            INSERT INTO sanctions 
            (soldier_id, soldier_tag, reason, evidence, warning_number, issued_by, issued_by_tag, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                data.soldier_id,
                data.soldier_tag,
                data.reason,
                data.evidence,
                data.warning_number,
                data.issued_by,
                data.issued_by_tag,
                data.timestamp
            ]
        );
    },

    async getLatestSanction(bot, soldierId) {
        return bot.db.get(
            `
            SELECT * FROM sanctions WHERE soldier_id = ?
            ORDER BY id DESC LIMIT 1
        `,
            [soldierId]
        );
    },

    async getSanctionsList(bot) {
        return bot.db.all(`
            SELECT soldier_id, soldier_tag, warnings
            FROM soldier_warnings
            ORDER BY warnings DESC
        `);
    },

    async getHistory(bot, soldierId) {
        return bot.db.all(
            `
            SELECT * FROM sanctions WHERE soldier_id = ?
            ORDER BY id ASC
        `,
            [soldierId]
        );
    },

    async removeOneWarning(bot, soldierId) {
        const current = await this.getWarnings(bot, soldierId);

        if (current > 1) {
            await bot.db.run(
                `
                UPDATE soldier_warnings 
                SET warnings = warnings - 1
                WHERE soldier_id = ?
            `,
                [soldierId]
            );
        } else {
            await bot.db.run(
                `
                DELETE FROM soldier_warnings WHERE soldier_id = ?
            `,
                [soldierId]
            );
        }
    },

    async removeAllWarnings(bot, soldierId) {
        await bot.db.run(
            `
            DELETE FROM soldier_warnings WHERE soldier_id = ?
        `,
            [soldierId]
        );
    }
};
