// modules/absences/index.js
"use strict";

const service = require("./service");
const ui = require("./ui");

module.exports = {
    name: "absences",

    onLoad(bot) {
        this.config = require("./config");
        this.service = service;
        this.ui = ui;

        bot.modules = bot.modules || {};
        bot.modules.absences = this;

        console.log("[absences] Módulo de Ausencias e Inactividades Militares cargado.");
    },

    async deployPanel(bot, channel) {
        return this.ui.deploy(bot, channel);
    }
};
