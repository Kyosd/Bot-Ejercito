// modules/tickets/events/interaction.js
"use strict";

const service = require("../service");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        try {
            // 1. Envío de Modal de Creación de Sección de Tickets
            if (interaction.isModalSubmit()) {
                const id = interaction.customId || "";

                if (id.startsWith("TICK_MDL_")) {
                    const draftKey = id.replace("TICK_MDL_", "");
                    let draft = bot._tempSectionDrafts?.get(draftKey);

                    if (draft) {
                        bot._tempSectionDrafts.delete(draftKey);
                    } else {
                        // Fallback si expiró o reinició
                        draft = {
                            name: "Tickets",
                            panelChannelId: interaction.channelId,
                            discordCategoryId: null,
                            categoryName: "🎫 TICKETS",
                            roleId: null
                        };
                    }

                    return await service.handleSectionModalSubmit(bot, interaction, draft);
                }
                return;
            }

            // 2. Selector de Categoría en el Panel de Tickets General (Multi-categoría)
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "TICKET_SELECT_CATEGORY") {
                    const selectedValue = interaction.values?.[0] || "";
                    const categoryId = selectedValue.replace("ticket_cat_", "");

                    try {
                        await interaction.message.edit({
                            components: interaction.message.components
                        }).catch(() => null);
                    } catch (_) {}

                    return await service.createTicket(bot, interaction, categoryId);
                }
                return;
            }

            // 3. Botones del Sistema de Tickets
            if (interaction.isButton()) {
                const id = interaction.customId || "";

                if (!id.startsWith("TICK_")) return;

                // Abrir ticket desde panel de sección personalizada
                if (id.startsWith("TICK_OPEN_SEC_")) {
                    const sectionId = id.replace("TICK_OPEN_SEC_", "");
                    return await service.openSectionTicket(bot, interaction, sectionId);
                }

                // Solicitar cierre con confirmación
                if (id === "TICK_CLOSE") {
                    return await service.requestClose(bot, interaction);
                }

                // Confirmar cierre definitivo
                if (id === "TICK_CONFIRM_CLOSE") {
                    return await service.executeClose(bot, interaction);
                }

                // Cancelar cierre
                if (id === "TICK_CANCEL_CLOSE") {
                    return await interaction.update({
                        content: "✅ Cierre cancelado. El ticket continuará activo.",
                        components: []
                    });
                }

                // Reclamar ticket
                if (id === "TICK_CLAIM") {
                    return await service.claimTicket(bot, interaction);
                }

                // Transcripción rápida
                if (id === "TICK_TRANSCRIPT") {
                    await interaction.deferReply({ ephemeral: true });
                    const ticket = await bot.db.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channelId]);
                    const attachment = await service.generateTranscript(interaction.channel, ticket);
                    return await interaction.editReply({
                        content: "📋 **Copia de seguridad del ticket:**",
                        files: [attachment]
                    });
                }
            }
        } catch (err) {
            console.error("[tickets interaction error]:", err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: `❌ Ocurrió un error al procesar el ticket: ${err.message || "Error desconocido."}`,
                        ephemeral: true
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: `❌ Ocurrió un error al procesar el ticket: ${err.message || "Error desconocido."}`
                    });
                }
            } catch (_) {}
        }
    }
};
