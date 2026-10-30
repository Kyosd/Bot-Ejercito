// modules/profiles/commands/expediente.js
"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");
const { rankCodeFor } = require("../../../core/identity");

function hm(minutes) {
    const n = Math.max(0, Number(minutes) || 0);
    return `${Math.floor(n / 60)}h ${n % 60}m`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("expediente")
        .setDescription("Consulta la hoja de vida militar y estadísticas de un soldado")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a consultar (opcional, por defecto tú mismo)")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        const targetUser = interaction.options.getUser("soldado") || interaction.user;
        const userId = targetUser.id;
        const db = bot.db;

        let profile = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [userId]);
        if (!profile) {
            await db.run(
                "INSERT INTO soldier_profiles (user_id, rank, division, joined_at) VALUES (?, ?, ?, ?)",
                [userId, "Recluta", "Infantería", Date.now()]
            );
            profile = {
                user_id: userId,
                rank: "Recluta",
                division: "Infantería",
                joined_at: Date.now(),
                medals: "[]",
                notes: "",
                display_name: null,
                plate: null,
                rank_code: null,
                verified_at: null
            };
        }

        const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);
        let estadoServicio = "⚪ **Libre de Servicio**";
        if (active) {
            if (active.paused_at) {
                estadoServicio = `⏸️ **En Pausa** (desde <t:${Math.floor(active.paused_at / 1000)}:R>)`;
            } else {
                estadoServicio = `🟢 **En Servicio Activo** (iniciado <t:${Math.floor(active.start / 1000)}:R>)`;
            }
        }

        const hoursMod = bot.modules?.hours;
        let weeklyMinutes = 0;
        if (hoursMod?.weekly) {
            weeklyMinutes = await hoursMod.weekly.getUserWeeklyMinutes(bot, userId);
        }

        const totalRow = await db.get("SELECT SUM(duration) AS total FROM hours_sessions WHERE user_id = ?", [userId]);
        const totalMinutes = Number(totalRow?.total || 0);

        const warnRow = await db.get("SELECT warnings FROM soldier_warnings WHERE soldier_id = ?", [userId]);
        const warnings = warnRow?.warnings || 0;
        const blocked = await db.get("SELECT reason FROM hours_blocked WHERE user_id = ?", [userId]);

        let disciplinario = `⚠️ **Advertencias:** \`${warnings}/3\``;
        if (blocked) {
            disciplinario += `\n⛔ **ESTADO:** \`SUSPENDIDO / CORTE MARCIAL\`\n*Motivo:* ${blocked.reason}`;
        } else if (warnings === 0) {
            disciplinario += "\n✅ **Conducta:** `Impecable`";
        }

        let medalsList = "Sin condecoraciones aún.";
        try {
            const parsed = JSON.parse(profile.medals || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
                medalsList = parsed.join(" • ");
            }
        } catch (_) {}

        const weekStart = await getWeekStart(db);
        const arrestsWeek = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ? AND created_at >= ?",
            [userId, weekStart]
        ).catch(() => ({ n: 0 }));
        const arrestsTotal = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ?",
            [userId]
        ).catch(() => ({ n: 0 }));
        const lastArrest = await db.get(
            "SELECT civilian_name, infraction_label, created_at FROM arrests WHERE soldier_id = ? ORDER BY created_at DESC LIMIT 1",
            [userId]
        ).catch(() => null);

        const suppliesWeek = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ? AND created_at >= ?",
            [userId, weekStart]
        ).catch(() => ({ n: 0 }));
        const suppliesTotal = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ?",
            [userId]
        ).catch(() => ({ n: 0 }));

        const code = profile.rank_code || rankCodeFor(profile.rank);
        const identity = profile.plate
            ? `\`[${profile.plate}] ${profile.display_name || targetUser.username} ${code}\``
            : "`Sin placa — pendiente de verificación`";
        const verified = profile.verified_at
            ? `✅ Verificado <t:${Math.floor(Number(profile.verified_at) / 1000)}:d>`
            : "❌ Sin verificar";

        let arrestLine = `• **Semana:** \`${Number(arrestsWeek?.n || 0)}\` efectuados\n• **Total:** \`${Number(arrestsTotal?.n || 0)}\` efectuados`;
        if (lastArrest) {
            const civText = lastArrest.civilian_name ? ` (${lastArrest.civilian_name})` : "";
            arrestLine += `\n• **Último:** ${lastArrest.infraction_label}${civText} (<t:${Math.floor(lastArrest.created_at / 1000)}:R>)`;
        }

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(`🎖️ EXPEDIENTE MILITAR — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setDescription(`Identidad operativa: ${identity}\n${verified}`)
            .addFields([
                { name: "👤 Soldado", value: `<@${userId}>`, inline: true },
                { name: "🔰 Rango", value: `**${profile.rank}** ${code}`, inline: true },
                { name: "🛡️ División", value: `**${profile.division}**`, inline: true },
                { name: "📡 Estado actual", value: estadoServicio, inline: false },
                { name: "⏱️ Servicio", value: `• **Semana:** \`${hm(weeklyMinutes)}\`\n• **Histórico:** \`${hm(totalMinutes)}\``, inline: true },
                { name: "⚖️ Disciplina", value: disciplinario, inline: true },
                { name: "🚨 Arrestos", value: arrestLine, inline: true },
                { name: "📦 Abastecimiento", value: `• **Semana:** \`${Number(suppliesWeek?.n || 0)}\`\n• **Total:** \`${Number(suppliesTotal?.n || 0)}\``, inline: true },
                { name: "🏅 Condecoraciones", value: medalsList, inline: false }
            ])
            .setFooter({ text: "Comando General • Sistema Táctico de Personal" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
