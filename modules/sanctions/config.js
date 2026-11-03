// modules/sanctions/config.js
"use strict";

const coreConfig = require("../../core/config");

function getWarningRoles() {
    if (process.env.WARNING_ROLES_IDS) {
        return process.env.WARNING_ROLES_IDS.split(",").map(id => id.trim()).filter(Boolean);
    }
    return [
        process.env.ROLE_WARNING_1_ID || null,
        process.env.ROLE_WARNING_2_ID || null,
        process.env.ROLE_WARNING_3_ID || null
    ].filter(Boolean);
}

module.exports = {
    // Mandos autorizados (heredados centralizadamente de coreConfig)
    generals: coreConfig.generals,

    // Canales del sistema disciplinario configurables por .env
    sanctionsChannel: process.env.CHANNEL_SANCTIONS || coreConfig.channels.sanctions,
    logsChannel: process.env.CHANNEL_SANCTIONS_LOGS || coreConfig.channels.sanctionsLogs,

    // IDs de los 3 roles para identificar el número de advertencias (1, 2, 3)
    warningRoles: getWarningRoles(),
    roleWarning1: process.env.ROLE_WARNING_1_ID || null,
    roleWarning2: process.env.ROLE_WARNING_2_ID || null,
    roleWarning3: process.env.ROLE_WARNING_3_ID || null,

    colors: {
        warning: coreConfig.colors.warning || "#ffaa00",
        log: coreConfig.colors.log || "#1e2b3c"
    }
};
