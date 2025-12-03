// modules/sanctions/embeds.js
const { EmbedBuilder } = require("discord.js");
const cfg = require("./config");

module.exports = {
    warningsEmbed(soldierTag, warnings) {
        return new EmbedBuilder()
            .setColor(cfg.colors.warning)
            .setTitle("Advertencias activas")
            .setDescription(
                `Soldado: ${soldierTag}\n⚠️ **${warnings}/3 advertencias activas**`
            )
            .setTimestamp();
    },

    listEmbed(list) {
        const embed = new EmbedBuilder()
            .setColor(cfg.colors.warning)
            .setTitle("Lista de sancionados");

        if (!list.length) {
            embed.setDescription("No hay sancionados actualmente.");
            return embed;
        }

        const txt = list
            .map(
                (x, i) =>
                    `${i + 1}. <@${x.soldier_id}> — **${x.warnings}/3** advertencias`
            )
            .join("\n");

        embed.setDescription(txt);
        return embed;
    },

    historyEmbed(soldierTag, history) {
        const embed = new EmbedBuilder()
            .setColor(cfg.colors.warning)
            .setTitle(`Historial de sanciones — ${soldierTag}`);

        if (!history.length) {
            embed.setDescription("Este soldado no tiene sanciones registradas.");
            return embed;
        }

        const txt = history
            .map(x => {
                const date = new Date(x.timestamp).toLocaleString();
                return `• **${x.warning_number}/3** — ${x.reason} (${date})`;
            })
            .join("\n");

        embed.setDescription(txt);
        return embed;
    }
};
