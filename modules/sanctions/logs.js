// modules/sanctions/logs.js
const { EmbedBuilder } = require("discord.js");

module.exports = async function logSanction(
    bot,
    action,
    generalId,
    targetId,
    detail = "-"
) {
    const mod = bot.modules.sanctions;
    const cfg = mod.config;
    const timestamp = Date.now();

    // Guardar en BD
    await bot.db.run(
        `
        INSERT INTO sanction_logs (action, general_id, target_soldier_id, detail, timestamp)
        VALUES (?, ?, ?, ?, ?)
        `,
        [action, generalId, targetId || null, detail, timestamp]
    );

    // Canal de logs
    if (!cfg.logsChannel) return;

    const logsChannel = bot.client.channels.cache.get(cfg.logsChannel);
    if (!logsChannel) return;

    const embed = new EmbedBuilder()
        .setColor(cfg.colors.log)
        .setTitle("📘 Log del Sistema de Sanciones")
        .addFields(
            { name: "Acción", value: action },
            { name: "General", value: `<@${generalId}>`, inline: true },
            {
                name: "Objetivo",
                value: targetId ? `<@${targetId}>` : "N/A",
                inline: true
            },
            { name: "Detalles", value: detail }
        )
        .setFooter({ text: new Date(timestamp).toLocaleString() });

    logsChannel.send({ embeds: [embed] }).catch(() => {});
};
