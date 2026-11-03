// modules/absences/config.js
"use strict";

const coreConfig = require("../../core/config");

module.exports = {
    panelChannel: process.env.CHANNEL_ABSENCES_PANEL || process.env.CHANNEL_ABSENCES || coreConfig.channels.absencesPanel,
    colors: {
        ui: coreConfig.colors.militaryGold || "#d4af37",
        success: coreConfig.colors.success || "#4b8b3b",
        danger: coreConfig.colors.danger || "#8b1e1e",
        embed: coreConfig.colors.embed || "#3b6b34"
    }
};
