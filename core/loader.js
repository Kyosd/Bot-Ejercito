// core/loader.js
const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

class Loader {

    // ========================
    // EVENTOS GLOBALES
    // ========================
    static registerEvents(bot) {
        const eventsPath = path.join(__dirname, "../events");
        const files = fs.readdirSync(eventsPath);

        for (const file of files) {
            const eventName = file.replace(".js", "");
            const handler = require(path.join(eventsPath, file));

            bot.client.on(eventName, (...args) =>
                handler(bot, ...args)
            );
        }
    }

    // ========================
    // MÓDULOS
    // ========================
    static registerModules(bot) {
        bot.modules = {};
        if (!bot.client.commands) bot.client.commands = new Collection();

        const modulesPath = path.join(__dirname, "../modules");
        const folders = fs.readdirSync(modulesPath);

        for (const folder of folders) {
            const indexPath = path.join(modulesPath, folder, "index.js");
            if (!fs.existsSync(indexPath)) continue;

            const mod = require(indexPath);
            bot.modules[mod.name] = mod;

            // ------------------------
            // 1) COMANDOS
            // ------------------------
            if (mod.commands && Array.isArray(mod.commands)) {
                for (let item of mod.commands) {

                    if (typeof item === "string") item = require(item);

                    const command = item;

                    if (!command?.data?.name || typeof command.execute !== "function") {
                        console.warn(`[WARN] Comando inválido en módulo ${mod.name}`);
                        continue;
                    }

                    bot.client.commands.set(command.data.name, command);
                    console.log(`[COMMAND] Registrado: ${command.data.name} (${mod.name})`);
                }
            }

            // ------------------------
            // 2) EVENTOS DE MÓDULO
            // ------------------------
            if (mod.events && Array.isArray(mod.events)) {
                for (let item of mod.events) {

                    if (typeof item === "string") item = require(item);

                    const event = item;

                    if (!event?.name || typeof event.execute !== "function") {
                        console.warn(`[WARN] Evento inválido en módulo ${mod.name}`);
                        continue;
                    }

                    // FIX REAL: SOLO ENVIAR (bot, interaction)
                    bot.client.on(event.name, (...args) =>
                        event.execute(bot, ...args)
                    );

                    console.log(`[EVENT] Registrado event: ${event.name} (${mod.name})`);
                }
            }

            // ------------------------
            // 3) onLoad()
            // ------------------------
            if (typeof mod.onLoad === "function") {
                try {
                    mod.onLoad(bot);
                } catch (err) {
                    console.error(`[ERROR] en onLoad() del módulo ${mod.name}:`, err);
                }
            }
        }
    }
}

module.exports = Loader;
