// modules/sanctions/logs.js
const { EmbedBuilder } = require("discord.js");

module.exports = async function logSanction(bot, action, generalId, targetId, detail = "-") {
    const timestamp = Date.now();

    // ============================================
    // GUARDAR LOG EN LA BASE DE DATOS
    // ============================================
    await bot.db.run(
        `
        INSERT INTO sanction_logs (action, general_id, target_soldier_id, detail, timestamp)
        VALUES (?, ?, ?, ?, ?)
        `,
        [action, generalId, targetId || null, detail, timestamp]
    );

    // ============================================
    // ENVIAR EMBED AL CANAL DE LOGS
    // ============================================
    const logsChannel = bot.client.channels.cache.get(process.env.SANCTIONS_LOGS_CHANNEL);
    if (!logsChannel) return;

    const embed = new EmbedBuilder()
        .setColor("#1e2b3c")
        .setTitle("📘 Log del Sistema de Sanciones")
        .addFields(
            { name: "Acción", value: action },
            { name: "General", value: `<@${generalId}>`, inline: true },
            { name: "Objetivo", value: targetId ? `<@${targetId}>` : "N/A", inline: true },
            { name: "Detalles", value: detail }
        )
        .setFooter({ text: new Date(timestamp).toLocaleString() });

    logsChannel.send({ embeds: [embed] }).catch(() => {});
};
