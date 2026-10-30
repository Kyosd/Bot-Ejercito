// events/ready.js
"use strict";

const { Routes, REST } = require("discord.js");
const config = require("../core/config");
const presence = require("../core/presence");

module.exports = {
    name: "ready",

    async execute(bot) {
        console.log(`[READY] 🎖️ Ejército Nacional Bot en línea: ${bot.client.user.tag}`);

        try {
            presence.start(bot);
        } catch (err) {
            console.error("[ERROR] presence:", err);
        }

        // Desplegar UI del módulo HOURS si está activo
        if (bot.modules.hours?.deployUI) {
            try {
                await bot.modules.hours.deployUI(bot);
            } catch (err) {
                console.error("[ERROR] deployUI hours:", err);
            }
        }

        if (bot.modules.verify?.deployPanel) {
            try {
                await bot.modules.verify.deployPanel(bot);
            } catch (err) {
                console.error("[ERROR] verify panel:", err);
            }
        }

        // Registrar Slash Commands
        const commandsArray = Array.from(bot.client.commands.values());
        if (!commandsArray.length) {
            console.log("[SLASH] No hay comandos para registrar.");
            return;
        }

        const rest = new REST({ version: "10" }).setToken(config.token);
        const body = commandsArray.map(cmd => cmd.data.toJSON());

        try {
            if (config.guildId) {
                await rest.put(
                    Routes.applicationGuildCommands(config.clientId, config.guildId),
                    { body }
                );
                console.log(`[SLASH] ${body.length} comandos de servidor registrados correctamente.`);
            } else {
                await rest.put(
                    Routes.applicationCommands(config.clientId),
                    { body }
                );
                console.log(`[SLASH] ${body.length} comandos globales registrados correctamente.`);
            }
        } catch (err) {
            console.error("[SLASH ERROR] Error registrando comandos:", err);
        }
    }
};
