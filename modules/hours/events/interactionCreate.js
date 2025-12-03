"use strict";

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        const hours = bot.modules?.hours;
        if (!hours) return;

        try {
            // BOTONES PRINCIPALES (entrar/salir/panel generales)
            if (interaction.isButton()) {
                const id = interaction.customId;

                if (id === "HOURS_SERVICE_IN" || id === "HOURS_SERVICE_OUT" || id === "HOURS_GENERAL_PANEL") {
                    return hours.ui.route(bot, interaction);
                }

                return;
            }

            // MENÚS DESPLEGABLES DEL PANEL DE GENERALES
            if (interaction.isStringSelectMenu()) {
                const id = interaction.customId;

                if (id === "HOURS_GENERAL_MENU") {
                    return hours.admin.handleGeneralMenu(bot, interaction);
                }

                if (id.startsWith("HOURS_GENERAL_TARGET_")) {
                    return hours.admin.handleTargetSelect(bot, interaction);
                }

                return;
            }

            // MODALS (ADD / REMOVE HORAS)
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith("MOD_HOURS_")) {
                    return hours.admin.handleModal(bot, interaction);
                }
            }

        } catch (err) {
            console.error("[hours interactionCreate] Error:", err);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Ocurrió un error procesando la interacción del sistema de horas.",
                    ephemeral: true
                });
            }
        }
    }
};
