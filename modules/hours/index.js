"use strict";

const scheduler = require("./scheduler");

module.exports = {
    name: "hours",

    onLoad(bot) {
        // Cargar componentes del módulo
        this.config  = require("./config");
        this.service = require("./service");
        this.embeds  = require("./embeds");
        this.admin   = require("./admin");
        this.weekly  = require("./weekly");
        this.ui      = require("./ui");
        this.logs    = require("./logs");

        // Registrar módulo
        bot.modules = bot.modules || {};
        bot.modules.hours = this;

        // Iniciar scheduler del módulo HOURS
        try {
            scheduler.start(bot);
            console.log("[hours] Scheduler iniciado correctamente.");
        } catch (err) {
            console.error("[hours] Error iniciando scheduler:", err);
        }
    },

    async deployUI(bot) {
        return this.ui.deploy(bot);
    },

    async handleButton(bot, interaction) {
        return this.ui.route(bot, interaction);
    },

    async handleModal(bot, interaction) {
        return this.admin.handleModal(bot, interaction);
    },

    async weeklyReport(bot, auto = false) {
        return this.weekly.generate(bot, auto);
    }
};
