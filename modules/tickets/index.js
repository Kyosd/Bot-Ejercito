// modules/tickets/index.js
"use strict";

module.exports = {
    name: "tickets",

    async onLoad(bot) {
        this.config = require("./config");
        this.service = require("./service");
        this.panelManager = require("./panelManager");

        bot.modules = bot.modules || {};
        bot.modules.tickets = this;

        console.log("[tickets] Módulo de Tickets y Atención Institucional cargado correctamente.");

        // Sincronizar y reconstruir automáticamente paneles en Discord si el bot ya está listo
        if (bot.client?.isReady()) {
            this.panelManager.refreshPublishedPanels(bot).catch(err => {
                console.error("[tickets] Error en refreshPublishedPanels:", err.message);
            });
        }
    },

    // Invocado desde events/ready.js al encender el bot
    async onReady(bot) {
        if (this.panelManager) {
            await this.panelManager.refreshPublishedPanels(bot).catch(err => {
                console.error("[tickets] Error sincronizando paneles en ready:", err.message);
            });
        }
    }
};
