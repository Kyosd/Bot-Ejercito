// modules/hours/weekly.js
"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const coreConfig = require("../../core/config");
const logs = require("./logs");

function hm(minutes) {
    const n = Math.max(0, Number(minutes) || 0);
    return `${Math.floor(n / 60)}h ${n % 60}m`;
}

module.exports = {
    async ensureMeta(bot) {
        await bot.db.run(`
            CREATE TABLE IF NOT EXISTS hours_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        const row = await bot.db.get(
            "SELECT value FROM hours_meta WHERE key = 'weekly_reset_at'"
        );

        if (row?.value) {
            const n = Number(row.value);
            if (Number.isFinite(n) && n > 0) return n;
        }

        const now = new Date();
        const day = now.getDay(); // 0 domingo
        const diff = day;

        const lastSunday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - diff,
            config.settings.weeklyResetHour,
            config.settings.weeklyResetMinute,
            0, 0
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
        await bot.db.run(
            `
            INSERT INTO hours_meta (key, value)
            VALUES ('weekly_reset_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `,
            [now]
        );
    },

    async _setLastAutoRunMinute(bot, minuteKey) {
        await bot.db.run(
            `
            INSERT INTO hours_meta (key, value)
            VALUES ('weekly_last_auto_run', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `,
            [minuteKey]
        );
    },

    async _getLastAutoRunMinute(bot) {
        const row = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'weekly_last_auto_run'");
        return row?.value ?? null;
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
        return Number(row?.total || 0);
    },

    /**
     * Recopila todos los datos de la semana y genera el informe integral.
     */
    async collectWeeklyData(bot, resetAt) {
        const db = bot.db;

        // 1. HORAS DE SERVICIO
        const hoursRows = await db.all(
            `
            SELECT user_id, SUM(duration) AS total
            FROM hours_sessions
            WHERE start >= ?
            GROUP BY user_id
            ORDER BY total DESC
            `,
            [resetAt]
        );
        const totalMinutesBatch = hoursRows.reduce((acc, r) => acc + Number(r.total || 0), 0);

        // 2. ARRESTOS DE LA SEMANA
        const arrestsRows = await db.all(
            `
            SELECT soldier_id, COUNT(*) AS count
            FROM arrests
            WHERE created_at >= ?
            GROUP BY soldier_id
            ORDER BY count DESC
            `,
            [resetAt]
        ).catch(() => []);
        const totalArrests = arrestsRows.reduce((acc, r) => acc + Number(r.count || 0), 0);

        // 3. ABASTECIMIENTOS DE LA SEMANA
        const suppliesRows = await db.all(
            `
            SELECT soldier_id, SUM(amount) AS total_amount
            FROM supplies
            WHERE created_at >= ?
            GROUP BY soldier_id
            ORDER BY total_amount DESC
            `,
            [resetAt]
        ).catch(() => []);
        const totalSuppliesUnits = suppliesRows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

        const suppliesByType = await db.all(
            `
            SELECT supply_type, SUM(amount) AS type_total
            FROM supplies
            WHERE created_at >= ?
            GROUP BY supply_type
            ORDER BY type_total DESC
            `,
            [resetAt]
        ).catch(() => []);

        // 4. SANCIONES Y ADVERTENCIAS (SIN BORRARLAS)
        const weekSanctions = await db.all(
            `
            SELECT soldier_id, reason, warning_number, issued_by, timestamp
            FROM sanctions
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
            `,
            [resetAt]
        ).catch(() => []);

        const activeWarnings = await db.all(
            `
            SELECT soldier_id, warnings
            FROM soldier_warnings
            WHERE warnings > 0
            ORDER BY warnings DESC
            `
        ).catch(() => []);

        const courtMartials = await db.all(
            "SELECT user_id, reason FROM hours_blocked"
        ).catch(() => []);

        // 5. AUSENCIAS DE LA SEMANA
        const absences = await db.all(
            `
            SELECT user_id, reason, duration, status, start_date
            FROM absences
            WHERE start_date >= ? OR status = 'ACTIVE'
            ORDER BY start_date DESC
            `,
            [resetAt]
        ).catch(() => []);

        return {
            resetAt,
            hoursRows,
            totalMinutesBatch,
            arrestsRows,
            totalArrests,
            suppliesRows,
            totalSuppliesUnits,
            suppliesByType,
            weekSanctions,
            activeWarnings,
            courtMartials,
            absences
        };
    },

    buildWeeklyEmbeds(data) {
        const startSec = Math.floor(data.resetAt / 1000);
        const endSec = Math.floor(Date.now() / 1000);

        // ============================
        // EMBED 1: BALANCE GENERAL & CUADRO DE HONOR
        // ============================
        const topHours = data.hoursRows[0] ? `<@${data.hoursRows[0].user_id}> (${hm(data.hoursRows[0].total)})` : "*Ninguno*";
        const topArrests = data.arrestsRows[0] ? `<@${data.arrestsRows[0].soldier_id}> (${data.arrestsRows[0].count} capturas)` : "*Ninguno*";
        const topSupplies = data.suppliesRows[0] ? `<@${data.suppliesRows[0].soldier_id}> (${data.suppliesRows[0].total_amount} cargas)` : "*Ninguno*";

        const overviewEmbed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(`🎖️ INFORME GENERAL DE CIERRE SEMANAL — ${config.system.name}`)
            .setDescription(
                `Reporte consolidado del contingente militar correspondiente al periodo:\n` +
                `📅 **Desde:** <t:${startSec}:F>\n` +
                `📅 **Hasta:** <t:${endSec}:F>\n\n` +
                `────────────────────────────────────────\n` +
                `🏆 **CUADRO DE HONOR DEL BATALLÓN**\n` +
                `• 🥇 **Mayor Servicio:** ${topHours}\n` +
                `• 🚨 **Líder de Capturas:** ${topArrests}\n` +
                `• 📦 **Líder Logístico:** ${topSupplies}\n` +
                `────────────────────────────────────────`
            )
            .addFields(
                { name: "⏱️ Tiempo Total de Guardia", value: `\`${hm(data.totalMinutesBatch)}\``, inline: true },
                { name: "🚨 Total Arrestos Civiles", value: `\`${data.totalArrests}\` procedimientos`, inline: true },
                { name: "📦 Cargas Abastecidas", value: `\`${data.totalSuppliesUnits}\` unidades`, inline: true }
            )
            .setFooter({ text: "Comando General • Balance Táctico Oficial" })
            .setTimestamp();

        // ============================
        // EMBED 2: HORAS & OPERATIVIDAD (ARRESTOS + SUMINISTROS)
        // ============================
        let hoursDesc = "*No se registraron horas de servicio.*";
        if (data.hoursRows.length > 0) {
            hoursDesc = data.hoursRows.slice(0, 15).map((r, i) => {
                const medal = ["🥇", "🥈", "🥉"][i] || `\`#${i + 1}\``;
                return `${medal} <@${r.user_id}> — **${hm(r.total)}**`;
            }).join("\n");
            if (data.hoursRows.length > 15) {
                hoursDesc += `\n*... y ${data.hoursRows.length - 15} soldados más.*`;
            }
        }

        let arrestsDesc = "*Sin arrestos registrados esta semana.*";
        if (data.arrestsRows.length > 0) {
            arrestsDesc = data.arrestsRows.slice(0, 10).map((r, i) => {
                return `**${i + 1}.** <@${r.soldier_id}> — **${r.count}** arrestos`;
            }).join("\n");
        }

        let suppliesDesc = "*Sin abastecimientos esta semana.*";
        if (data.suppliesRows.length > 0) {
            suppliesDesc = data.suppliesRows.slice(0, 10).map((r, i) => {
                return `**${i + 1}.** <@${r.soldier_id}> — **${r.total_amount}** unidades`;
            }).join("\n");

            if (data.suppliesByType.length > 0) {
                const breakdown = data.suppliesByType.map(t => `${t.supply_type}: \`${t.type_total}\``).join(" • ");
                suppliesDesc += `\n*Desglose:* ${breakdown}`;
            }
        }

        const statsEmbed = new EmbedBuilder()
            .setColor(config.colors.ui)
            .setTitle("📊 DESGLOSE OPERATIVO Y LOGÍSTICA")
            .addFields(
                { name: "⏱️ Escalafón de Horas de Guardia", value: hoursDesc.slice(0, 1024), inline: false },
                { name: "🚨 Procedimientos de Arresto Realizados", value: arrestsDesc.slice(0, 1024), inline: true },
                { name: "📦 Abastecimientos de Patrulla", value: suppliesDesc.slice(0, 1024), inline: true }
            )
            .setFooter({ text: "Dirección de Operaciones Militares" });

        // ============================
        // EMBED 3: AUDITORÍA DISCIPLINARIA (ADVERTENCIAS SIN BORRAR) & AUSENCIAS
        // ============================
        let disciplineDesc = "✅ **Comportamiento Impecable:** No hay soldados con advertencias activas.";
        if (data.activeWarnings.length > 0) {
            disciplineDesc = data.activeWarnings.map(w => {
                const isCourt = data.courtMartials.some(c => c.user_id === w.soldier_id);
                const tagStatus = isCourt ? "🔴 `SUSPENDIDO / CORTE MARCIAL`" : "⚠️ `Activa`";
                return `• <@${w.soldier_id}> — **${w.warnings}/3 advertencias** (${tagStatus})`;
            }).join("\n");
        }

        let weekSanctionsDesc = "*Sin sanciones aplicadas durante la semana.*";
        if (data.weekSanctions.length > 0) {
            weekSanctionsDesc = data.weekSanctions.slice(0, 10).map(s => {
                return `• <@${s.soldier_id}> — Adv \`${s.warning_number}/3\`: *${s.reason}* (por <@${s.issued_by}>)`;
            }).join("\n");
        }

        let absencesDesc = "✅ Todo el contingente militar estuvo en disponibilidad completa.";
        if (data.absences.length > 0) {
            absencesDesc = data.absences.map(a => {
                const st = a.status === "ACTIVE" ? "🟢 `Vigente`" : "⚪ `Concluida`";
                return `• <@${a.user_id}> — *${a.reason}* (${a.duration}) [${st}]`;
            }).join("\n");
        }

        const disciplineEmbed = new EmbedBuilder()
            .setColor(data.activeWarnings.length > 0 ? coreConfig.colors.warning : coreConfig.colors.success)
            .setTitle("⚖️ ESTADO DISCIPLINARIO Y REGISTRO DE AUSENCIAS")
            .setDescription(
                "📌 **Normativa:** Las advertencias disciplinarias son **acumulativas y no se eliminan** en el cierre semanal para preservar el historial del expediente.\n\n" +
                "**⚠️ Censo de Advertencias Militares Activas:**\n" +
                disciplineDesc + "\n\n" +
                "**📄 Sanciones Aplicadas en esta Semana:**\n" +
                weekSanctionsDesc
            )
            .addFields(
                { name: "📋 Novedades y Permisos de Ausencia", value: absencesDesc.slice(0, 1024), inline: false }
            )
            .setFooter({ text: "Auditoría Interna • Ejército Nacional" });

        return [overviewEmbed, statsEmbed, disciplineEmbed];
    },

    async generate(bot, auto = false, interaction = null, privateForGeneral = false) {
        const resetAt = await this.ensureMeta(bot);
        const data = await this.collectWeeklyData(bot, resetAt);

        const hasActivity = data.hoursRows.length > 0 || data.totalArrests > 0 || data.totalSuppliesUnits > 0 || data.weekSanctions.length > 0;
        if (!hasActivity && interaction) {
            return interaction.reply({
                content: "ℹ️ No se ha registrado actividad (horas, arrestos ni suministros) desde el último cierre semanal.",
                ephemeral: true
            });
        }

        const embeds = this.buildWeeklyEmbeds(data);

        // Envío Automático por Cron
        if (auto) {
            const now = new Date();
            const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
            const last = await this._getLastAutoRunMinute(bot);
            if (last === minuteKey) return;

            const channelId = config.channels.report || coreConfig.channels.report;
            if (!channelId) return;

            const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
            if (!guild) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            await channel.send({ embeds });

            // Actualizar reinicio de la semana para el nuevo ciclo de horas, arrestos y suministros
            await this.setWeeklyResetNow(bot);
            await this._setLastAutoRunMinute(bot, minuteKey);
            await logs.weeklyReport(bot, true, null);
            return;
        }

        // Envío Manual Privado para General (Previsualización)
        if (interaction && privateForGeneral) {
            await interaction.reply({ embeds, ephemeral: true });
            await logs.weeklyReport(bot, false, interaction.user);
            return;
        }

        // Envío Manual Público al canal de cierre de semana
        if (interaction && !privateForGeneral) {
            const channelId = config.channels.report || coreConfig.channels.report;
            const targetChannel = (channelId && interaction.guild)
                ? (interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null))
                : interaction.channel;

            if (targetChannel && targetChannel.id !== interaction.channelId && targetChannel.isTextBased()) {
                await targetChannel.send({ embeds });
                await interaction.reply({
                    content: `✅ **Cierre semanal emitido exitosamente.** Publicado en <#${targetChannel.id}>.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({ embeds, ephemeral: false });
            }

            // Actualizar reinicio de la semana para el nuevo ciclo
            await this.setWeeklyResetNow(bot);
            await logs.weeklyReport(bot, false, interaction.user);
        }
    }
};
