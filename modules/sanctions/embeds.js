const { EmbedBuilder } = require("discord.js");
const config = require("../../core/config");

module.exports = {

    warningsEmbed(soldierTag, warnings) {
        return new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle(`Advertencias activas`)
            .setDescription(`Soldado: ${soldierTag}\n⚠️ **${warnings}/3 advertencias activas**`)
            .setTimestamp();
    },

    listEmbed(list) {
        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle("Lista de sancionados");

        if (list.length === 0) {
            embed.setDescription("No hay sancionados actualmente.");
            return embed;
        }

        const txt = list
            .map((x, i) => `${i + 1}. <@${x.soldier_id}> — **${x.warnings}/3**`)
            .join("\n");

        embed.setDescription(txt);
        return embed;
    },

    historyEmbed(soldierTag, history) {
        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle(`Historial de sanciones — ${soldierTag}`);

        if (history.length === 0) {
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
