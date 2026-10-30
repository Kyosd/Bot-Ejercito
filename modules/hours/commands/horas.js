"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config");
const { minutesToHM, rel, ts, toInt } = require("../utils");

function sessionMinutes(active) {
    if (!active) return 0;
    const now = Date.now();
    let paused = toInt(active.total_paused, 0);
    if (active.paused_at) paused += Math.max(0, now - toInt(active.paused_at));
    return Math.max(0, Math.floor((now - toInt(active.start) - paused) / 60000));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("horas")
        .setDescription("Consulta el estado de servicio y horas de un soldado")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a consultar (por defecto tú)")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        const user = interaction.options.getUser("soldado") || interaction.user;
        const db = bot.db;
        const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [user.id]);
        const weekly = await bot.modules?.hours?.weekly?.getUserWeeklyMinutes(bot, user.id) || 0;
        const totalRow = await db.get("SELECT SUM(duration) AS total FROM hours_sessions WHERE user_id = ?", [user.id]);
        const total = Number(totalRow?.total || 0);
        const live = minutesToHM(sessionMinutes(active));
        const w = minutesToHM(weekly);
        const t = minutesToHM(total);

        let estado = "⚪ Fuera de servicio";
        if (active?.paused_at) estado = `⏸️ En pausa desde ${rel(active.paused_at)}`;
        else if (active) estado = `🟢 En servicio desde ${rel(active.start)} (${ts(active.start, "t")})`;

        const embed = new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(`📡 Estado de servicio — ${user.displayName || user.username}`)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Estado", value: estado, inline: false },
                { name: "Turno actual", value: `**${live.text}**`, inline: true },
                { name: "Esta semana", value: `**${w.text}**`, inline: true },
                { name: "Histórico", value: `**${t.text}**`, inline: true }
            )
            .setFooter({ text: config.system.footer })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
