// core/loader.js
const fs   = require("fs");
const path = require("path");
const moduleConfig = require("./config.modules");

class Loader {

    // ============================
    // Eventos globales (/events)
    // ============================
    static registerEvents(bot) {
        const eventsPath = path.join(__dirname, "../events");

        for (const file of fs.readdirSync(eventsPath)) {
            if (!file.endsWith(".js")) continue;

            const event = require(path.join(eventsPath, file));

            if (!event?.name || typeof event.execute !== "function") {
                console.warn(`[EVENT] archivo inválido: ${file}`);
                continue;
            }

            bot.client.on(event.name, (...args) => event.execute(bot, ...args));
            console.log(`[EVENT] Cargado (obj): ${event.name}`);
        }
    }

    // ============================
    // Módulos (/modules)
    // ============================
    static registerModules(bot) {
        const modulesPath = path.join(__dirname, "../modules");

        const folders = fs.readdirSync(modulesPath)
            .filter(name => moduleConfig.enabledModules.includes(name));

        bot.modules = {};
        bot.client.commands ??= new Map();

        for (const folder of folders) {
            const moduleDir = path.join(modulesPath, folder);
            const indexPath = path.join(moduleDir, "index.js");

            if (!fs.existsSync(indexPath)) {
                console.warn(`[LOADER] Módulo "${folder}" ignorado: no tiene index.js`);
                continue;
            }

            const moduleObj = require(indexPath);
            bot.modules[moduleObj.name ?? folder] = moduleObj;

            console.log(`[MODULE] Cargado módulo: ${moduleObj.name ?? folder}`);

            // config.js del módulo (opcional)
            const configPath = path.join(moduleDir, "config.js");
            if (fs.existsSync(configPath)) {
                moduleObj.config = require(configPath);
                console.log(`[CONFIG] Cargada config de ${moduleObj.name}`);
            }

            // comandos del módulo (opcional)
            const commandsPath = path.join(moduleDir, "commands");
            if (fs.existsSync(commandsPath)) {
                for (const file of fs.readdirSync(commandsPath)) {
                    if (!file.endsWith(".js")) continue;

                    const command = require(path.join(commandsPath, file));

                    if (!command?.data?.name) {
                        console.warn(`[WARN] Comando inválido en módulo ${folder}: ${file}`);
                        continue;
                    }

                    bot.client.commands.set(command.data.name, command);
                    console.log(`[COMMAND] Registrado: ${command.data.name}`);
                }
            }

            // eventos del módulo (opcional)
            const eventsPath = path.join(moduleDir, "events");
            if (fs.existsSync(eventsPath)) {
                for (const file of fs.readdirSync(eventsPath)) {
                    if (!file.endsWith(".js")) continue;

                    const event = require(path.join(eventsPath, file));

                    if (!event?.name || typeof event.execute !== "function") {
                        console.warn(`[WARN] Evento inválido en módulo ${folder}: ${file}`);
                        continue;
                    }

                    bot.client.on(event.name, (...args) =>
                        event.execute(bot, ...args)
                    );

                    console.log(`[EVENT] Registrado evento: ${event.name} (${folder})`);
                }
            }

            // hook onLoad del módulo
            if (typeof moduleObj.onLoad === "function") {
                try {
                    moduleObj.onLoad(bot);
                    console.log(`[LOAD] Ejecutado onLoad() en ${folder}`);
                } catch (err) {
                    console.error(`[ERROR] onLoad() en módulo ${folder}:`, err);
                }
            }
        }
    }
}

module.exports = Loader;
