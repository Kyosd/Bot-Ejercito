"use strict";

module.exports = {
    start(bot) {
        const hours = bot.modules?.hours;
        if (!hours || !hours.config || !hours.config.settings) {
            console.log("[hours scheduler] Config no disponible, no se inicia scheduler.");
            return;
        }

        const cfg = hours.config.settings;

        console.log("[hours scheduler] Iniciado sistema de reporte semanal...");

        setInterval(async () => {
            // Seguridad: confirmar que el módulo sigue cargado
            const mod = bot.modules?.hours;
            if (!mod || !mod.config || !mod.config.settings) return;

            const now = new Date();

            const match =
                now.getDay()    === cfg.weeklyResetDay &&
                now.getHours()  === cfg.weeklyResetHour &&
                now.getMinutes() === cfg.weeklyResetMinute;

            if (!match) return;

            try {
                console.log("[hours scheduler] Ejecutando reporte semanal automático...");
                await mod.weeklyReport(bot, true);
            } catch (err) {
                console.error("[hours scheduler] Error en reporte semanal:", err);
            }
        }, 60 * 1000); // se evalúa cada minuto
    }
};
