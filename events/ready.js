// events/ready.js
"use strict";

const { Routes, REST } = require("discord.js");
const config = require("../core/config");

module.exports = {
    name: "ready",

    async execute(bot) {
        console.log(`Ejercito Nacional ON ${bot.client.user.tag}`);

        // UI del módulo HOURS (si existe)
        if (bot.modules.hours?.deployUI) {
            try {
                bot.modules.hours.deployUI(bot);
            } catch (err) {
                console.error("[ERROR] deployUI hours:", err);
            }
        }

        // Si no hay comandos, no intentes registrar nada
        const commandsArray = Array.from(bot.client.commands.values());
        if (!commandsArray.length) {
            console.log("[SLASH] No hay comandos para registrar.");
            return;
        }

        const rest = new REST({ version: "10" }).setToken(config.token);
        const body = commandsArray.map(cmd => cmd.data.toJSON());

        try {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body }
            );

            console.log(`[SLASH] ${body.length} comandos registrados correctamente.`);
        } catch (err) {
            console.error("[SLASH ERROR]", err);
        }
    }
};
