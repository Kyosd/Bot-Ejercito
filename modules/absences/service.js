// modules/absences/service.js
"use strict";

module.exports = {
    async isAbsent(bot, userId) {
        if (!userId) return null;
        const db = bot.db;
        return db.get(
            "SELECT * FROM absences WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
            [userId]
        ).catch(() => null);
    },

    async getActiveAbsences(bot) {
        const db = bot.db;
        return db.all(
            "SELECT * FROM absences WHERE status = 'ACTIVE' ORDER BY start_date DESC"
        ).catch(() => []);
    },

    async getWeekAbsences(bot, sinceTimestamp) {
        const db = bot.db;
        return db.all(
            "SELECT * FROM absences WHERE start_date >= ? OR status = 'ACTIVE' ORDER BY start_date DESC",
            [sinceTimestamp]
        ).catch(() => []);
    },

    async createAbsence(bot, user, reason, duration) {
        const db = bot.db;
        const now = Date.now();
        const userId = user.id;
        const userTag = `<@${userId}>`;
        const userName = user.tag || user.username;

        // 1. Si estaba en servicio activo, forzar cierre de turno seguro
        const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]).catch(() => null);
        if (active) {
            let totalPaused = Number(active.total_paused || 0);
            if (active.paused_at) {
                totalPaused += Math.max(0, now - Number(active.paused_at));
            }
            const minutes = Math.max(1, Math.floor((now - Number(active.start) - totalPaused) / 60000));
            await db.run(
                'INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)',
                [userId, active.start, now, minutes]
            ).catch(() => null);
            await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]).catch(() => null);

            // Refrescar panel de horas
            try {
                await bot.modules?.hours?.livePanel?.update(bot);
            } catch (_) {}
        }

        // 2. Desactivar cualquier ausencia previa que hubiera quedado abierta
        await db.run(
            "UPDATE absences SET status = 'ENDED', ended_at = ? WHERE user_id = ? AND status = 'ACTIVE'",
            [now, userId]
        ).catch(() => null);

        // 3. Insertar nueva ausencia
        await db.run(
            `
            INSERT INTO absences (user_id, user_tag, user_name, reason, duration, start_date, end_date, status, created_at, ended_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?, NULL)
            `,
            [userId, userTag, userName, reason, duration, now, now]
        );

        // 4. Refrescar panel de ausencias en canal
        try {
            await bot.modules?.absences?.ui?.update(bot);
        } catch (_) {}

        return true;
    },

    async endAbsence(bot, userId) {
        const db = bot.db;
        const active = await this.isAbsent(bot, userId);
        if (!active) return false;

        const now = Date.now();
        await db.run(
            "UPDATE absences SET status = 'ENDED', ended_at = ? WHERE id = ?",
            [now, active.id]
        );

        // Refrescar panel de ausencias en canal
        try {
            await bot.modules?.absences?.ui?.update(bot);
        } catch (_) {}

        return true;
    }
};
