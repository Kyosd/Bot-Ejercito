// modules/tickets/index.js
"use strict";

module.exports = {
    name: "tickets",

    onLoad(bot) {
        this.config = require("./config");
        this.service = require("./service");
        console.log("[tickets] Módulo de Tickets y Atención Militar cargado correctamente.");
    }
};
