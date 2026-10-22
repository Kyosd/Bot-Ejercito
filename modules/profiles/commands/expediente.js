// modules/profiles/commands/expediente.js
"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");

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

        // 1. Obtener perfil militar
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
                notes: ""
            };
        }

        // 2. Estado de servicio
        const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);
        let estadoServicio = "⚪ **Libre de Servicio**";
        if (active) {
            if (active.paused_at) {
                estadoServicio = `⏸️ **En Pausa** (desde <t:${Math.floor(active.paused_at / 1000)}:R>)`;
            } else {
                estadoServicio = `🟢 **En Servicio Activo** (iniciado <t:${Math.floor(active.start / 1000)}:R>)`;
            }
        }

        // 3. Horas de servicio
        const hoursMod = bot.modules?.hours;
        let weeklyMinutes = 0;
        if (hoursMod?.weekly) {
            weeklyMinutes = await hoursMod.weekly.getUserWeeklyMinutes(bot, userId);
        }

        const totalRow = await db.get("SELECT SUM(duration) AS total FROM hours_sessions WHERE user_id = ?", [userId]);
        const totalMinutes = Number(totalRow?.total || 0);

        const wH = Math.floor(weeklyMinutes / 60);
        const wM = weeklyMinutes % 60;
        const tH = Math.floor(totalMinutes / 60);
        const tM = totalMinutes % 60;

        // 4. Advertencias y Régimen Disciplinario
        const warnRow = await db.get("SELECT warnings FROM soldier_warnings WHERE soldier_id = ?", [userId]);
        const warnings = warnRow?.warnings || 0;
        const blocked = await db.get("SELECT reason FROM hours_blocked WHERE user_id = ?", [userId]);

        let disciplinario = `⚠️ **Advertencias:** \`${warnings}/3\``;
        if (blocked) {
            disciplinario += `\n⛔ **ESTADO:** \`SUSPENDIDO / CORTE MARCIAL\`\n*Motivo:* ${blocked.reason}`;
        } else if (warnings === 0) {
            disciplinario += "\n✅ **Conducta:** `Impecable`";
        }

        // 5. Medallas
        let medalsList = "Sin condecoraciones aún.";
        try {
            const parsed = JSON.parse(profile.medals || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
                medalsList = parsed.join(" • ");
            }
        } catch (_) {}

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(`🎖️ EXPEDIENTE MILITAR — ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`Ficha táctica oficial registrada en la base de datos del Ejército.`)
            .addFields([
                { name: "👤 Soldado", value: `<@${userId}> (\`${userId}\`)`, inline: true },
                { name: "🔰 Rango Militar", value: `**${profile.rank}**`, inline: true },
                { name: "🛡️ División", value: `**${profile.division}**`, inline: true },
                { name: "📡 Estado Actual", value: estadoServicio, inline: false },
                { name: "⏱️ Tiempo de Servicio", value: `• **Esta semana:** \`${wH}h ${wM}m\`\n• **Total histórico:** \`${tH}h ${tM}m\``, inline: true },
                { name: "⚖️ Régimen Disciplinario", value: disciplinario, inline: true },
                { name: "🏅 Condecoraciones y Méritos", value: medalsList, inline: false }
            ])
            .setFooter({ text: "Comando General • Sistema Táctico de Personal" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
