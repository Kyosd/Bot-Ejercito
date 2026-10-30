"use strict";

const { ActivityType } = require("discord.js");

async function collectStats(bot) {
    const db = bot.db;
    let tickets = 0;
    let onDuty = 0;
    let pendingVerify = 0;

    try {
        const t = await db.get("SELECT COUNT(*) AS n FROM tickets WHERE status = 'OPEN'");
        tickets = Number(t?.n || 0);
    } catch (_) {}

    try {
        const h = await db.get("SELECT COUNT(*) AS n FROM hours_active");
        onDuty = Number(h?.n || 0);
    } catch (_) {}

    try {
        const v = await db.get("SELECT COUNT(*) AS n FROM verification_requests WHERE status = 'PENDING'");
        pendingVerify = Number(v?.n || 0);
    } catch (_) {}

    return { tickets, onDuty, pendingVerify };
}

function rotate(bot) {
    const states = bot._presenceStates || [];
    if (!states.length || !bot.client.user) return;
    const idx = bot._presenceIndex || 0;
    const current = states[idx % states.length];
    bot._presenceIndex = (idx + 1) % states.length;

    bot.client.user.setPresence({
        activities: [{ name: current, type: ActivityType.Watching }],
        status: "online"
    }).catch(() => {});
}

module.exports = {
    start(bot) {
        const tick = async () => {
            const stats = await collectStats(bot);
            bot._presenceStates = [
                `🎟️ ${stats.tickets} ticket${stats.tickets === 1 ? "" : "s"}`,
                `👥 ${stats.onDuty} militar${stats.onDuty === 1 ? "" : "es"} en servicio`,
                `🙋🏻‍♂️ ${stats.pendingVerify} solicitud${stats.pendingVerify === 1 ? "" : "es"} de verificación`
            ];
            rotate(bot);
        };

        tick().catch(() => {});
        if (bot._presenceInterval) clearInterval(bot._presenceInterval);
        bot._presenceInterval = setInterval(() => {
            tick().catch(() => {});
        }, 20000);
        console.log("[PRESENCE] Estados rotativos activos.");
    }
};
