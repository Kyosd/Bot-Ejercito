// modules/sendCenter/events/interaction.js
module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {

        const sendCenter = bot.modules.sendCenter;
        if (!sendCenter) return;

        // Botones
        if (interaction.isButton()) {
            const id = interaction.customId;

            if (!id) return;

            if (id.startsWith("scmodal_") || id.startsWith("scnormal_")) {
                return sendCenter.handleButton(bot, interaction);
            }

            return;
        }

        // Modales
        if (interaction.isModalSubmit()) {
            const id = interaction.customId;

            if (!id) return;

            if (
                id.startsWith("scmodal_submit_") ||
                id.startsWith("scnormal_submit_")
            ) {
                return sendCenter.handleModal(bot, interaction);
            }

            return;
        }
    }
};
