const weekly = require("./weekly");
const embeds = require("./embeds");
const config = require("../../core/config");

module.exports = {

    async startService(bot, interaction) {
        const userId = interaction.user.id;
        const db = bot.db;

        // Bloqueado
        const blocked = await db.get(
            "SELECT user_id FROM hours_blocked WHERE user_id = ?",
            [userId]
        );
        if (blocked) {
            return interaction.reply({
                content: "No estás autorizado para registrar servicio.",
                ephemeral: true
            });
        }

        // Ya activo
        const active = await db.get(
            "SELECT * FROM hours_active WHERE user_id = ?",
            [userId]
        );
        if (active) {
            return interaction.reply({
                content: "Ya tienes un servicio activo.",
                ephemeral: true
            });
        }

        const now = Date.now();

        await db.run(
            "INSERT INTO hours_active (user_id, start) VALUES (?, ?)",
            [userId, now]
        );

        // Total histórico
        const rowTotal = await db.get(
            "SELECT SUM(duration) as total FROM hours_sessions WHERE user_id = ?",
            [userId]
        );
        const totalMinutes = rowTotal?.total || 0;

        // Total semanal
        const weeklyMinutes = await weekly.getUserWeeklyMinutes(bot, userId);

        const embed = embeds.serviceIn(
            interaction.user,
            now,
            totalMinutes,
            weeklyMinutes
        );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async endService(bot, interaction) {
        const userId = interaction.user.id;
        const db = bot.db;

        const active = await db.get(
            "SELECT * FROM hours_active WHERE user_id = ?",
            [userId]
        );

        if (!active) {
            return interaction.reply({
                content: "No tienes un servicio activo.",
                ephemeral: true
            });
        }

        const now = Date.now();
        const minutes = Math.floor((now - active.start) / 60000);

        // Registrar sesión
        await db.run(
            "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
            [userId, active.start, now, minutes]
        );

        // Quitar estado activo
        await db.run(
            "DELETE FROM hours_active WHERE user_id = ?",
            [userId]
        );

        // Total histórico
        const rowTotal = await db.get(
            "SELECT SUM(duration) as total FROM hours_sessions WHERE user_id = ?",
            [userId]
        );
        const totalMinutes = rowTotal?.total || 0;

        // Total semanal después de esta sesión
        const weeklyMinutes = await weekly.getUserWeeklyMinutes(bot, userId);

        const embed = embeds.serviceOut(
            interaction.user,
            active.start,
            now,
            minutes,
            totalMinutes,
            weeklyMinutes
        );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
