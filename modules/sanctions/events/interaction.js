// modules/sanctions/events/interaction.js
const {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder
} = require("discord.js");

const service = require("../service");
const embeds = require("../embeds");
const logSanction = require("../logs");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        const mod = bot.modules.sanctions;
        if (!mod) return;

        // Solo manejamos botones y menús de selección
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const id = interaction.customId ?? "";

        // ----------------------------------------------
        // CANCELAR
        // ----------------------------------------------
        if (id === "san_cancel") {
            return interaction.update({
                content: "Acción cancelada.",
                components: []
            });
        }

        // ----------------------------------------------
        // CERRAR PANEL
        // ----------------------------------------------
        if (id === "san_close") {
            return interaction.update({
                content: "Panel cerrado.",
                components: []
            });
        }

        // ----------------------------------------------
        // VER ADVERTENCIAS
        // ----------------------------------------------
        if (id.startsWith("san_view_")) {
            const soldierId = id.split("_")[2];
            const warnings = await service.getWarnings(bot, soldierId);

            return interaction.reply({
                embeds: [embeds.warningsEmbed(`<@${soldierId}>`, warnings)],
                ephemeral: true
            });
        }

        // ----------------------------------------------
        // CONFIRMAR ELIMINAR ÚLTIMA ADV
        // ----------------------------------------------
        if (id.startsWith("confirm_delete_last_")) {
            const soldierId = id.split("_")[3];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`do_delete_last_${soldierId}`)
                    .setLabel("Confirmar")
                    .setStyle(4),
                new ButtonBuilder()
                    .setCustomId("san_cancel")
                    .setLabel("Cancelar")
                    .setStyle(2)
            );

            return interaction.reply({
                content: `¿Eliminar **la última sanción** de <@${soldierId}>?`,
                components: [row],
                ephemeral: true
            });
        }

        if (id.startsWith("do_delete_last_")) {
            const soldierId = id.split("_")[3];

            await service.removeOneWarning(bot, soldierId);
            await logSanction(
                bot,
                "eliminar_ultima_sancion",
                interaction.user.id,
                soldierId,
                "Última sanción eliminada"
            );

            return interaction.update({
                content: "Última sanción eliminada.",
                components: []
            });
        }

        // ----------------------------------------------
        // CONFIRMAR ELIMINAR 1 ADV
        // ----------------------------------------------
        if (id.startsWith("confirm_delete_one_")) {
            const soldierId = id.split("_")[3];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`do_delete_one_${soldierId}`)
                    .setLabel("Confirmar")
                    .setStyle(4),
                new ButtonBuilder()
                    .setCustomId("san_cancel")
                    .setLabel("Cancelar")
                    .setStyle(2)
            );

            return interaction.reply({
                content: `¿Eliminar **una advertencia** de <@${soldierId}>?`,
                components: [row],
                ephemeral: true
            });
        }

        if (id.startsWith("do_delete_one_")) {
            const soldierId = id.split("_")[3];

            await service.removeOneWarning(bot, soldierId);
            await logSanction(
                bot,
                "eliminar_1_advertencia",
                interaction.user.id,
                soldierId,
                "Se eliminó 1 ADV"
            );

            return interaction.update({
                content: "Advertencia eliminada.",
                components: []
            });
        }

        // ----------------------------------------------
        // CONFIRMAR RESET
        // ----------------------------------------------
        if (id.startsWith("confirm_reset_")) {
            const soldierId = id.split("_")[2];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`do_reset_${soldierId}`)
                    .setLabel("Confirmar")
                    .setStyle(4),
                new ButtonBuilder()
                    .setCustomId("san_cancel")
                    .setLabel("Cancelar")
                    .setStyle(2)
            );

            return interaction.reply({
                content: `¿Seguro que deseas **resetear todas las advertencias** de <@${soldierId}>?`,
                components: [row],
                ephemeral: true
            });
        }

        if (id.startsWith("do_reset_")) {
            const soldierId = id.split("_")[2];

            await service.removeAllWarnings(bot, soldierId);
            await logSanction(
                bot,
                "resetear_advertencias",
                interaction.user.id,
                soldierId,
                "Se reseteó todo el ADV"
            );

            return interaction.update({
                content: "Advertencias reseteadas.",
                components: []
            });
        }

        // ----------------------------------------------
        // SELECT MENÚ
        // ----------------------------------------------
        if (interaction.isStringSelectMenu() && id.startsWith("san_menu_")) {
            const soldierId = id.split("_")[2];
            const soldierTag = `<@${soldierId}>`;
            const value = interaction.values[0];

            if (value === "list") {
                const list = await service.getSanctionsList(bot);
                return interaction.reply({
                    embeds: [embeds.listEmbed(list)],
                    ephemeral: true
                });
            }

            if (value === "history") {
                const history = await service.getHistory(bot, soldierId);
                return interaction.reply({
                    embeds: [embeds.historyEmbed(soldierTag, history)],
                    ephemeral: true
                });
            }

            if (value === "history_global") {
                const list = await service.getSanctionsList(bot);
                return interaction.reply({
                    embeds: [embeds.listEmbed(list)],
                    ephemeral: true
                });
            }

            if (value === "logs") {
                const rows = await bot.db.all(
                    `SELECT * FROM sanction_logs ORDER BY log_id DESC LIMIT 10`
                );

                const embed = new EmbedBuilder()
                    .setColor(mod.config.colors.log)
                    .setTitle("📘 LOGS DEL SISTEMA DE SANCIONES");

                if (!rows.length) {
                    embed.setDescription("No hay logs registrados.");
                } else {
                    embed.setDescription(
                        rows
                            .map(
                                l =>
                                    `• **${l.action}**  
👮 General: <@${l.general_id}>  
🎯 Objetivo: ${
                                        l.target_soldier_id
                                            ? `<@${l.target_soldier_id}>`
                                            : "N/A"
                                    }  
📝 ${l.detail}  
📅 ${new Date(l.timestamp).toLocaleString()}`
                            )
                            .join("\n\n")
                    );
                }

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
        }
    }
};
