// core/config.js
"use strict";

require("dotenv").config();

const parsedGenerals = (process.env.GENERALS_IDS || process.env.ALTO_MANDO_IDS)
    ? (process.env.GENERALS_IDS || process.env.ALTO_MANDO_IDS).split(",").map(id => id.trim()).filter(Boolean)
    : [
        "1398131944872480890",
        "1420882354775527484",
        "1392985835355508766",
        "1396673898984112168",
        "434520425288957956"
    ];

// Canales principales resueltos con prioridad para nombres claros de entorno
const chHoursPanel = process.env.CHANNEL_HOURS_PANEL || process.env.CHANNEL_PRINCIPAL || "1398132225223950469";
const chWeeklyClosing = process.env.CHANNEL_WEEKLY_CLOSING || process.env.CHANNEL_REPORT || "1443688275608080394";
const chLogs = process.env.CHANNEL_LOGS || "1416997231499935875";
const chLiveStatus = process.env.CHANNEL_HOURS_LIVE_STATUS || process.env.CHANNEL_LIVE_STATUS || chHoursPanel;
const chSanctions = process.env.CHANNEL_SANCTIONS || "1518745086031298782";
const chSanctionsLogs = process.env.CHANNEL_SANCTIONS_LOGS || "1444087102701834280";
const chAuditBackups = process.env.CHANNEL_AUDIT_BACKUPS || process.env.CHANNEL_AUDIT || chLogs;
const chVerifyRequests = process.env.CHANNEL_VERIFY_REQUESTS || process.env.CHANNEL_VERIFICATION || chLogs;
const chVerifyPanel = process.env.CHANNEL_VERIFY_PANEL || process.env.CHANNEL_VERIFICATION_PANEL || chHoursPanel;
const chArrests = process.env.CHANNEL_ARRESTS || chSanctions;
const chSupplies = process.env.CHANNEL_SUPPLIES || null;
const chAbsencesPanel = process.env.CHANNEL_ABSENCES_PANEL || process.env.CHANNEL_ABSENCES || chHoursPanel;
const chVerifyRejections = process.env.CHANNEL_VERIFY_REJECTIONS || process.env.CHANNEL_VERIFICATION_REJECTIONS || null;

const config = {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID || "1359765875636310058",
    clientId: process.env.CLIENT_ID,
    databaseUrl: process.env.DATABASE_URL || null,

    // Mandos y oficiales autorizados (IDs de roles o usuarios)
    generals: parsedGenerals,

    // Canales del servidor accesibles tanto por nombre tradicional como por nombre claro
    channels: {
        // Nombres claros recomendados
        hoursPanel: chHoursPanel,
        weeklyClosing: chWeeklyClosing,
        hoursLiveStatus: chLiveStatus,
        logs: chLogs,
        auditBackups: chAuditBackups,
        verifyPanel: chVerifyPanel,
        verifyRequests: chVerifyRequests,
        verifyRejections: chVerifyRejections,
        arrests: chArrests,
        supplies: chSupplies,
        sanctions: chSanctions,
        sanctionsLogs: chSanctionsLogs,
        absencesPanel: chAbsencesPanel,

        // Compatibilidad con código existente
        principal: chHoursPanel,
        report: chWeeklyClosing,
        liveStatus: chLiveStatus,
        auditBackup: chAuditBackups,
        verification: chVerifyRequests,
        verificationPanel: chVerifyPanel,
        absences: chAbsencesPanel
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
