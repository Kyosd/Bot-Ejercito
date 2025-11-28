// events/ready.js
const { Routes, REST } = require("discord.js");
require("dotenv").config();

module.exports = async (bot) => {
    console.log(`Ejercito Nacional ON ${bot.client.user.tag}`);

    // Registrar UI de horas
    if (bot.modules.hours?.deployUI) {
        bot.modules.hours.deployUI(bot);
    }

    // Registrar slash commands
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    const commands = bot.client.commands.map(cmd => cmd.data.toJSON());

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`[SLASH] ${commands.length} comandos registrados correctamente.`);
    } catch (err) {
        console.error("[SLASH ERROR]", err);
    }
};
