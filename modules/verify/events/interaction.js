"use strict";

const service = require("../service");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        try {
            if (interaction.isButton() && interaction.customId === "VERIFY_OPEN") {
                return service.openModal(interaction);
            }
            if (interaction.isModalSubmit() && interaction.customId === "VERIFY_MODAL") {
                return service.submitRequest(bot, interaction);
            }
            if (interaction.isButton() && interaction.customId === "VERIFY_APPROVE") {
                return service.handleDecision(bot, interaction, true);
            }
            if (interaction.isButton() && interaction.customId === "VERIFY_DENY") {
                return service.handleDecision(bot, interaction, false);
            }
        } catch (err) {
            console.error("[verify] Error de interacción:", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Ocurrió un error en el sistema de verificación.",
                    ephemeral: true
                }).catch(() => null);
            }
        }
    }
};
