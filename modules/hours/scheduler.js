"use strict";

const { AttachmentBuilder } = require("discord.js");
const coreConfig = require("../../core/config");

async function sendAutoBackup(bot) {
  try {
    const channelId = coreConfig.channels.auditBackup || coreConfig.channels.logs;
    if (!channelId) return;

    const guild = await bot.client.guilds.fetch(coreConfig.guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const db = bot.db;
    const backupData = {
      version: "2.1.0",
      type: "AUTOMATED_WEEKLY_BACKUP",
      timestamp: new Date().toISOString(),
      engine: db.type,
      data: {
        hours_active: await db.all("SELECT * FROM hours_active"),
        hours_sessions: await db.all("SELECT * FROM hours_sessions"),
        hours_blocked: await db.all("SELECT * FROM hours_blocked"),
        sanctions: await db.all("SELECT * FROM sanctions"),
        soldier_warnings: await db.all("SELECT * FROM soldier_warnings"),
        soldier_profiles: await db.all("SELECT * FROM soldier_profiles"),
        arrests: await db.all("SELECT * FROM arrests").catch(() => []),
        supplies: await db.all("SELECT * FROM supplies").catch(() => []),
        absences: await db.all("SELECT * FROM absences").catch(() => []),
        verification_requests: await db.all("SELECT * FROM verification_requests").catch(() => [])
      }
    };

    const attachment = new AttachmentBuilder(
      Buffer.from(JSON.stringify(backupData, null, 2), "utf-8"),
      { name: `auto_backup_${Date.now()}.json` }
    );

    await channel.send({
      content: "<:save:1565469393008332810> **Copia de seguridad automática semanal generada previo al reinicio:**",
      files: [attachment]
    });
  } catch (err) {
    console.error("[scheduler backup] Error enviando backup automático:", err);
  }
}

module.exports = {
  start(bot) {
    const hours = bot.modules?.hours;
    if (!hours?.config?.settings) {
      console.log("[hours scheduler] Config no disponible, no se inicia scheduler.");
      return;
    }

    if (hours._weeklyInterval) {
      clearInterval(hours._weeklyInterval);
      hours._weeklyInterval = null;
    }

    const cfg = hours.config.settings;
    console.log("[hours scheduler] Iniciado sistema de reporte y backup semanal...");

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
        console.log("[hours scheduler] Ejecutando reporte semanal automático y backup...");
        await sendAutoBackup(bot);
        await mod.weeklyReport(bot, true);
      } catch (err) {
        console.error("[hours scheduler] Error en reporte semanal:", err);
      }
    }, 60 * 1000);
  }
};
