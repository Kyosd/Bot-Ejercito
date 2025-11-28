const { EmbedBuilder } = require("discord.js");
const config = require("../../core/config");

module.exports = {

    // -------------------------------
    //  Asegura meta y calcula último domingo 06:00
    // -------------------------------
    async ensureMeta(bot) {
        await bot.db.run(`
            CREATE TABLE IF NOT EXISTS hours_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // Intentar leer meta existente
        const row = await bot.db.get(
            "SELECT value FROM hours_meta WHERE key = 'weekly_reset_at'"
        );

        if (row) {
            return parseInt(row.value, 10);
        }

        // Calcular último domingo 06:00
        const now = new Date();
        const today = now.getDay(); // 0 = domingo
        const daysBack = today;     // días hasta el último domingo

        const lastSunday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - daysBack,
            6, 0, 0, 0 // domingo 06:00
        );

        const resetAt = lastSunday.getTime();

        await bot.db.run(
            "INSERT INTO hours_meta (key, value) VALUES ('weekly_reset_at', ?)",
            [resetAt]
        );

        return resetAt;
    },


    // -------------------------------
    //  Setear manualmente reset horario (usado por reporte automático)
    // -------------------------------
    async setWeeklyResetNow(bot) {
        const now = Date.now();
        await bot.db.run(
            `
            INSERT INTO hours_meta (key, value)
            VALUES ('weekly_reset_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `,
            [now]
        );
    },


    // -------------------------------
    //  Obtener minutos semanales por usuario
    // -------------------------------
    async getUserWeeklyMinutes(bot, userId) {
        let resetAt = await this.ensureMeta(bot);
        resetAt = Number(resetAt);

        const row = await bot.db.get(
            `
            SELECT SUM(duration) AS total
            FROM hours_sessions
            WHERE user_id = ?
            AND start >= ?
            `,
            [userId, resetAt]
        );

        return row?.total || 0;
    },


    // -------------------------------
    //  Generar reporte semanal
    // -------------------------------
    async generate(bot, auto = false, interaction = null, privateForGeneral = false) {
        let resetAt = await this.ensureMeta(bot);
        resetAt = Number(resetAt);

        // Obtener usuarios y sus minutos semanales
        const rows = await bot.db.all(
            `
            SELECT user_id, SUM(duration) AS total
            FROM hours_sessions
            WHERE start >= ?
            GROUP BY user_id
            ORDER BY total DESC
            `,
            [resetAt]
        );

        if (!rows.length) {
            if (interaction) {
                return interaction.reply({
                    content: "No se han registrado horas desde el último reinicio semanal.",
                    ephemeral: true
                });
            }
            return;
        }

        
        let desc = "";
        let rank = 1;

        for (const r of rows) {
            const h = Math.floor(r.total / 60);
            const m = r.total % 60;
            desc += `**${rank}. <@${r.user_id}> — ${h}h ${m}m**\n`;
            rank++;
        }

        
        const embed = new EmbedBuilder()
            .setColor(config.hours.embedColor)
            .setTitle(`📘 Reporte Semanal — ${config.style.systemName}`)
            .setDescription(
                "Resumen de horas de servicio desde el último reinicio semanal.\n\n" +
                desc
            )
            .setFooter({ text: config.style.footer })
            .setTimestamp(Date.now());

        // -------------------------------
        // AUTOMÁTICO (domingo 06:00)
        // -------------------------------
        if (auto) {
            const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
            if (!guild) return;

            const channelId = config.channels.hoursReport;
            if (!channelId) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            await channel.send({ embeds: [embed] });

            // Resetear semana
            await this.setWeeklyResetNow(bot);

            return;
        }

        // -------------------------------
        // MANUAL (para generales)
        // -------------------------------
        if (interaction && privateForGeneral) {
            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        // MANUAL pero público (no usado normalmente)
        if (interaction && !privateForGeneral) {
            return interaction.reply({
                embeds: [embed],
                ephemeral: false
            });
        }
    }
};
