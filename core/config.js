require("dotenv").config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,

    // ================================
    // CANALES DEL SISTEMA DE HORAS
    // ================================
    channels: {
        hoursPrincipal: process.env.CHANNEL_HOURS_PRINCIPAL,
        hoursReport: process.env.CHANNEL_HOURS_REPORTES
    },

    // ================================
    // GENERALES (roles y usuarios)
    // ================================
    generals: process.env.ROLE_GENERALES
        ? process.env.ROLE_GENERALES
            .split(",")
            .map(id => id.trim())
        : [],

    // ================================
    // CONFIGURACIÓN DE HORAS
    // ================================
    hours: {
        resetDay: Number(process.env.HOURS_RESET_DAY || 0),
        resetHour: Number(process.env.HOURS_RESET_HOUR || 6),
        resetMinute: Number(process.env.HOURS_RESET_MINUTE || 0),
        embedColor: process.env.HOURS_EMBED_COLOR || "#0f7714"
    },

    // ================================
    // ESTILO GENERAL DEL SISTEMA
    // ================================
    style: {
        systemName: process.env.SYSTEM_NAME || "Ejército Nacional de Colombia",
        footer: process.env.SYSTEM_FOOTER || "Sistema Militar de Control Operativo",
        color: process.env.SYSTEM_COLOR || "#0f7714"
    }
};
