"use strict";

const coreConfig = require("../../core/config");

function splitIds(value) {
    return String(value || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

module.exports = {
    panelChannel: process.env.CHANNEL_VERIFY_PANEL || process.env.CHANNEL_VERIFICATION_PANEL || coreConfig.channels.verifyPanel,
    requestsChannel: process.env.CHANNEL_VERIFY_REQUESTS || process.env.CHANNEL_VERIFICATION || coreConfig.channels.verifyRequests,
    rejectionsChannel: process.env.CHANNEL_VERIFY_REJECTIONS || process.env.CHANNEL_VERIFICATION_REJECTIONS || coreConfig.channels.verifyRejections || null,
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
