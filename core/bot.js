const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const Database = require("./database");
const Loader = require("./loader");
const Scheduler = require("./scheduler");
const config = require("./config");

class Bot {
    constructor() {
        // Base de datos
        this.db = new Database();

        // Cliente de Discord
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages, // los que ya usabas
            ],
            partials: [Partials.Message, Partials.Channel]
        });

        // Colección de comandos (para el loader y módulos)
        this.client.commands = new Collection();
    }

    async start() {
        await this.db.init();

        // Eventos globales (carpeta /events)
        Loader.registerEvents(this);

        // Módulos (incluye sanciones)
        Loader.registerModules(this);

        // Scheduler
        Scheduler.start(this);

        // Login
        this.client.login(config.token);
    }
}

module.exports = Bot;
