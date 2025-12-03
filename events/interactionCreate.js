"use strict";

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        // Solo manejamos slash commands globales
        if (!interaction.isChatInputCommand()) return;

        const command = bot.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(bot, interaction);
        } catch (err) {
            console.error("[GLOBAL interactionCreate] Error ejecutando comando:", err);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Ocurrió un error ejecutando el comando.",
                    ephemeral: true
                });
            }
        }
    }
};
