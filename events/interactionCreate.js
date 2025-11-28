// events/interactionCreate.js
module.exports = async (bot, interaction) => {
    // Slash commands
    if (interaction.isChatInputCommand()) {
        const command = bot.client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(bot, interaction);
    }

    // Aquí dejas lo que ya tienes para horas (botones, modals, etc.)
    if (interaction.isButton()) {
        if (bot.modules.hours) {
            return bot.modules.hours.handleButton(bot, interaction);
        }
    }

    if (interaction.isModalSubmit()) {
        if (bot.modules.hours) {
            return bot.modules.hours.handleModal(bot, interaction);
        }
    }
};
