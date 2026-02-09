"use strict";

module.exports = {
  start(bot) {
    const hours = bot.modules?.hours;
    if (!hours?.config?.settings) {
      console.log("[hours scheduler] Config no disponible, no se inicia scheduler.");
      return;
    }

    // ✅ evita duplicados
    if (hours._weeklyInterval) {
      clearInterval(hours._weeklyInterval);
      hours._weeklyInterval = null;
    }

    const cfg = hours.config.settings;
    console.log("[hours scheduler] Iniciado sistema de reporte semanal...");

    hours._weeklyInterval = setInterval(async () => {
      const mod = bot.modules?.hours;
      if (!mod?.config?.settings) return;

      const now = new Date();
      const match =
        now.getDay() === cfg.weeklyResetDay &&
        now.getHours() === cfg.weeklyResetHour &&
        now.getMinutes() === cfg.weeklyResetMinute;

      if (!match) return;

      try {
        console.log("[hours scheduler] Ejecutando reporte semanal automático...");
        await mod.weeklyReport(bot, true);
      } catch (err) {
        console.error("[hours scheduler] Error en reporte semanal:", err);
      }
    }, 60 * 1000);
  }
};
