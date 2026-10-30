"use strict";

const weekly = require("./weekly");
const embeds = require("./embeds");
const logs = require("./logs");
const config = require("./config");
const { toInt, safeReply, minutesToHM } = require("./utils");

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
        "SELECT user_id, reason FROM hours_blocked WHERE user_id = ?",
        [userId]
      );
      if (blocked) {
        return safeReply(interaction, {
          content: `<:blocked:1565457686806397093> No estás autorizado para entrar en servicio.\n**Motivo:** ${blocked.reason || "Sanción activa o corte marcial."}`,
          ephemeral: true
        });
      }

      const active = await db.get(
        "SELECT * FROM hours_active WHERE user_id = ?",
        [userId]
      );
      if (active) {
        return safeReply(interaction, {
          content: "Ya tienes un servicio activo actualmente.",
          ephemeral: true
        });
      }

      const now = Date.now();

      await db.run(
        "INSERT INTO hours_active (user_id, start, paused_at, total_paused) VALUES (?, ?, NULL, 0)",
        [userId, now]
      );

      const totalMinutes = await getTotalMinutes(db, userId);
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

  async togglePause(bot, interaction) {
    const userId = interaction.user.id;
    const db = bot.db;

    try {
      const active = await db.get(
        "SELECT * FROM hours_active WHERE user_id = ?",
        [userId]
      );

      if (!active) {
        return safeReply(interaction, {
          content: "No tienes un servicio activo que pausar o reanudar.",
          ephemeral: true
        });
      }

      const now = Date.now();

      // Si ya está en pausa, reanudar
      if (active.paused_at) {
        const pauseMs = now - toInt(active.paused_at);
        const pauseMinutes = Math.floor(pauseMs / 60000);

        await db.run(
          "UPDATE hours_active SET paused_at = NULL, total_paused = COALESCE(total_paused, 0) + ? WHERE user_id = ?",
          [pauseMs, userId]
        );

        await refreshLive(bot);

        return safeReply(interaction, {
          content: `▶️ **Servicio reanudado.** Tu pausa fue de **${pauseMinutes} minutos**. Continúa con tu deber.`,
          ephemeral: true
        });
      } else {
        // Poner en pausa
        await db.run(
          "UPDATE hours_active SET paused_at = ? WHERE user_id = ?",
          [now, userId]
        );

        await refreshLive(bot);

        return safeReply(interaction, {
          content: "⏸️ **Servicio en pausa.** Mientras estés en pausa, el tiempo no contará para tus horas registradas. Vuelve a pulsar este botón cuando regreses.",
          ephemeral: true
        });
      }
    } catch (err) {
      console.error("[hours] Error en togglePause:", err);
      return safeReply(interaction, {
        content: "Ocurrió un error al gestionar la pausa del servicio.",
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
          content: "No tienes un servicio activo para finalizar.",
          ephemeral: true
        });
      }

      const now = Date.now();
      let totalPausedMs = toInt(active.total_paused, 0);

      // Si el usuario finaliza servicio mientras estaba en pausa
      if (active.paused_at) {
        totalPausedMs += Math.max(0, now - toInt(active.paused_at));
      }

      const rawElapsedMs = now - toInt(active.start);
      const effectiveWorkMs = Math.max(0, rawElapsedMs - totalPausedMs);
      let minutes = Math.floor(effectiveWorkMs / 60000);

      const minMinutes = config.settings?.minSessionMinutes || 1;
      if (minutes < minMinutes) {
        minutes = minMinutes;
      }

      await db.run(
        'INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)',
        [userId, active.start, now, minutes]
      );

      await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);

      const totalMinutes = await getTotalMinutes(db, userId);
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
  },

  async getMyStatus(bot, interaction) {
    const userId = interaction.user.id;
    const db = bot.db;
    const { EmbedBuilder } = require("discord.js");

    try {
      const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);
      const totalMinutes = await getTotalMinutes(db, userId);
      const weeklyMinutes = await weekly.getUserWeeklyMinutes(bot, userId);
      const now = Date.now();

      let estado = "⚪ Fuera de servicio";
      let liveMinutes = 0;
      if (active) {
        let paused = toInt(active.total_paused, 0);
        if (active.paused_at) {
          paused += Math.max(0, now - toInt(active.paused_at));
          estado = `⏸️ En pausa desde <t:${Math.floor(toInt(active.paused_at) / 1000)}:R>`;
        } else {
          estado = `🟢 En servicio desde <t:${Math.floor(toInt(active.start) / 1000)}:R>`;
        }
        liveMinutes = Math.max(0, Math.floor((now - toInt(active.start) - paused) / 60000));
      }

      const live = minutesToHM(liveMinutes);
      const week = minutesToHM(weeklyMinutes);
      const total = minutesToHM(totalMinutes);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle("📡 Tu estado de servicio")
        .setDescription(estado)
        .addFields(
          { name: "Turno actual (neto)", value: `**${live.text}**`, inline: true },
          { name: "Esta semana", value: `**${week.text}**`, inline: true },
          { name: "Histórico", value: `**${total.text}**`, inline: true }
        )
        .setFooter({ text: config.system.footer })
        .setTimestamp();

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error("[hours] Error en getMyStatus:", err);
      return safeReply(interaction, {
        content: "No se pudo consultar tu estado.",
        ephemeral: true
      });
    }
  }
};
