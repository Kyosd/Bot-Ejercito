"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const logs   = require("./logs");

module.exports = {

    async ensureMeta(bot) {
        await bot.db.run(`
            CREATE TABLE IF NOT EXISTS hours_meta (
                key   TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        const row = await bot.db.get(
            "SELECT value FROM hours_meta WHERE key = 'weekly_reset_at'"
        );

        if (row) return Number(row.value);

        const now = new Date();
        const day = now.getDay(); // 0 = domingo
        const diff = day;

        const lastSunday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - diff,
            config.settings.weeklyResetHour,
            config.settings.weeklyResetMinute,
            0,
            0
        );

        const resetAt = lastSunday.getTime();

        await bot.db.run(
            "INSERT INTO hours_meta (key, value) VALUES ('weekly_reset_at', ?)",
            [resetAt]
        );

        return resetAt;
    },

    async setWeeklyResetNow(bot) {
        const now = Date.now();

        await bot.db.run(`
            INSERT INTO hours_meta (key, value)
            VALUES ('weekly_reset_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [now]);
    },

    async getUserWeeklyMinutes(bot, userId) {
        const resetAt = await this.ensureMeta(bot);

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

    async generate(bot, auto = false, interaction = null, privateForGeneral = false) {
        const resetAt = await this.ensureMeta(bot);

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
            .setColor(config.colors.embed)
            .setTitle(`📘 Reporte Semanal — ${config.system.name}`)
            .setDescription(
                "Resumen de horas de servicio desde el último reinicio semanal.\n\n" +
                desc
            )
            .setFooter({ text: config.system.footer })
            .setTimestamp(Date.now());

        // Automático (scheduler)
        if (auto) {
            const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
            if (!guild) return;

            const channelId = config.channels.report;
            if (!channelId) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            await channel.send({ embeds: [embed] });

            await this.setWeeklyResetNow(bot);
            await logs.weeklyReport(bot, true, null);
            return;
        }

        // Manual para generales
        if (interaction && privateForGeneral) {
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            await logs.weeklyReport(bot, false, interaction.user);
            return;
        }

        // Manual público
        if (interaction && !privateForGeneral) {
            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            });
            await logs.weeklyReport(bot, false, interaction.user);
            return;
        }
    }
};
