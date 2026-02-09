"use strict";

const weekly = require("./weekly");
const embeds = require("./embeds");
const logs   = require("./logs");
const config = require("./config");
const { toInt, safeReply } = require("./utils");

async function getTotalMinutes(db, userId) {
  const row = await db.get(
    "SELECT SUM(duration) AS total FROM hours_sessions WHERE user_id = ?",
    [userId]
  );
  const total = row?.total ?? 0;
  return Number.isNaN(Number(total)) ? 0 : Number(total);
}

async function refreshLive(bot) {
  try {
    await bot.modules?.hours?.livePanel?.update(bot);
  } catch (_) {}
}

module.exports = {
  async startService(bot, interaction) {
    const userId = interaction.user.id;
    const db = bot.db;

    try {
      const blocked = await db.get(
        "SELECT user_id FROM hours_blocked WHERE user_id = ?",
        [userId]
      );
      if (blocked) {
        return safeReply(interaction, {
          content: "No estás autorizado para registrar servicio.",
          ephemeral: true
        });
      }

      const active = await db.get(
        "SELECT * FROM hours_active WHERE user_id = ?",
        [userId]
      );
      if (active) {
        return safeReply(interaction, {
          content: "Ya tienes un servicio activo.",
          ephemeral: true
        });
      }

      const now = Date.now();

      await db.run(
        "INSERT INTO hours_active (user_id, start) VALUES (?, ?)",
        [userId, now]
      );

      const totalMinutes  = await getTotalMinutes(db, userId);
      const weeklyMinutes = await weekly.getUserWeeklyMinutes(bot, userId);

      const embed = embeds.serviceIn(interaction.user, now, totalMinutes, weeklyMinutes);

      await safeReply(interaction, { embeds: [embed], ephemeral: true });
      await logs.serviceIn(bot, interaction.user, now);

      await refreshLive(bot);
    } catch (err) {
      console.error("[hours] Error en startService:", err);
      return safeReply(interaction, {
        content: "Ocurrió un error al iniciar el servicio.",
        ephemeral: true
      });
    }
  },

  async endService(bot, interaction) {
    const userId = interaction.user.id;
    const db = bot.db;

    try {
      const active = await db.get(
        "SELECT * FROM hours_active WHERE user_id = ?",
        [userId]
      );
      if (!active) {
        return safeReply(interaction, {
          content: "No tienes un servicio activo.",
          ephemeral: true
        });
      }

      const now = Date.now();
      let minutes = Math.max(0, Math.floor((now - toInt(active.start)) / 60000));

      if (minutes < config.settings.minSessionMinutes) {
        minutes = config.settings.minSessionMinutes;
      }

      await db.run(
        "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
        [userId, active.start, now, minutes]
      );

      await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);

      const totalMinutes  = await getTotalMinutes(db, userId);
      const weeklyMinutes = await weekly.getUserWeeklyMinutes(bot, userId);

      const embed = embeds.serviceOut(
        interaction.user,
        active.start,
        now,
        minutes,
        totalMinutes,
        weeklyMinutes
      );

      await safeReply(interaction, { embeds: [embed], ephemeral: true });

      await logs.serviceOut(
        bot,
        interaction.user,
        active.start,
        now,
        minutes,
        totalMinutes,
        weeklyMinutes
      );

      await refreshLive(bot);
    } catch (err) {
      console.error("[hours] Error en endService:", err);
      return safeReply(interaction, {
        content: "Ocurrió un error al finalizar el servicio.",
        ephemeral: true
      });
    }
  }
};
