// core/bot.js
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const Database  = require("./database");
const Loader    = require("./loader");
const config    = require("./config");

class Bot {
    constructor() {
        this.db = new Database();

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.User,
                Partials.GuildMember
            ]
        });

        this.client.commands = new Collection();
        this.guildId = config.guildId;
    }

    async start() {
        await this.db.init();

        Loader.registerEvents(this);
        Loader.registerModules(this);

        this.client.login(config.token);
    }
}

module.exports = Bot;
