"use strict";

async function getWeekStart(db) {
    const row = await db.get("SELECT value FROM hours_meta WHERE key = 'weekly_reset_at'").catch(() => null);
    if (row?.value) {
        const n = Number(row.value);
        if (Number.isFinite(n) && n > 0) return n;
    }

    const now = new Date();
    const lastSunday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay(),
        6, 0, 0, 0
    );
    return lastSunday.getTime();
}

module.exports = { getWeekStart };
