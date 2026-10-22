// core/config.js
"use strict";

require("dotenv").config();

const parsedGenerals = process.env.GENERALS_IDS
    ? process.env.GENERALS_IDS.split(",").map(id => id.trim()).filter(Boolean)
    : [
        "1398131944872480890",
        "1420882354775527484",
        "1392985835355508766",
        "1396673898984112168",
        "434520425288957956"
    ];

const config = {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID || "1359765875636310058",
    clientId: process.env.CLIENT_ID,
    databaseUrl: process.env.DATABASE_URL || null,

    // Mandos y oficiales autorizados (IDs de roles o usuarios)
    generals: parsedGenerals,

    // Canales por defecto (se pueden sobreescribir en .env)
    channels: {
        principal: process.env.CHANNEL_PRINCIPAL || "1398132225223950469",
        report: process.env.CHANNEL_REPORT || "1443688275608080394",
        logs: process.env.CHANNEL_LOGS || "1416997231499935875",
        liveStatus: process.env.CHANNEL_LIVE_STATUS || "1398132225223950469",
        sanctions: process.env.CHANNEL_SANCTIONS || "1518745086031298782",
        sanctionsLogs: process.env.CHANNEL_SANCTIONS_LOGS || "1444087102701834280",
        auditBackup: process.env.CHANNEL_AUDIT || "1416997231499935875"
    },

    colors: {
        ui: "#2d5a27",
        embed: "#3b6b34",
        log: "#1f2a1a",
        warning: "#c29d2a",
        danger: "#8b1e1e",
        success: "#4b8b3b",
        militaryGold: "#d4af37"
    },

    // Verificador universal de permisos de Mando / General
    isGeneral(memberOrUser) {
        if (!memberOrUser) return false;
        const id = typeof memberOrUser === "string" ? memberOrUser : (memberOrUser.id || memberOrUser.user?.id);
        if (!id) return false;

        // Verificar por ID de usuario
        if (config.generals.includes(id)) return true;

        // Verificar por roles (si es GuildMember)
        const rolesCache = memberOrUser.roles?.cache;
        if (rolesCache) {
            return rolesCache.some(role => config.generals.includes(role.id));
        }

        return false;
    }
};

module.exports = config;
