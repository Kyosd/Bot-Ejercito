"use strict";

const coreConfig = require("../../core/config");

function splitIds(value) {
    return String(value || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

module.exports = {
    panelChannel: process.env.CHANNEL_VERIFICATION_PANEL || coreConfig.channels.principal,
    requestsChannel: process.env.CHANNEL_VERIFICATION || coreConfig.channels.logs,
    verifiedRoleIds: splitIds(process.env.VERIFIED_ROLE_IDS),
    unverifiedRoleIds: splitIds(process.env.UNVERIFIED_ROLE_IDS),
    defaultRank: process.env.DEFAULT_VERIFY_RANK || "Recluta",
    defaultDivision: process.env.DEFAULT_VERIFY_DIVISION || "Infantería",
    colors: {
        embed: coreConfig.colors.embed,
        gold: coreConfig.colors.militaryGold,
        success: coreConfig.colors.success,
        danger: coreConfig.colors.danger
    }
};
