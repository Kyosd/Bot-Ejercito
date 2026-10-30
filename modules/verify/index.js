"use strict";

const service = require("./service");
const config = require("./config");

module.exports = {
    name: "verify",

    onLoad(bot) {
        this.config = config;
        this.service = service;
        console.log("[verify] Módulo de verificación cargado.");
    },

    async deployPanel(bot) {
        const channelId = process.env.CHANNEL_VERIFICATION_PANEL || config.panelChannel;
        if (!process.env.CHANNEL_VERIFICATION_PANEL) return;
        const channel = await bot.client.channels.fetch(channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            console.warn("[verify] Canal del panel no encontrado:", channelId);
            return;
        }
        return service.deployPanel(bot, channel);
    }
};
