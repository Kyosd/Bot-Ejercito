"use strict";

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const weekly = require("./weekly");
const config = require("./config");
const coreConfig = require("../../core/config");
const logs = require("./logs");
const { rel, safeReply, toInt, minutesToHM } = require("./utils");

function isGeneral(memberOrUser) {
  if (typeof coreConfig.isGeneral === "function") {
    return coreConfig.isGeneral(memberOrUser);
  }
  const ids = config.generals || [];
  if (!ids.length) return false;
  const id = typeof memberOrUser === "string" ? memberOrUser : (memberOrUser?.id || memberOrUser?.user?.id);
  if (ids.includes(id)) return true;
  if (memberOrUser?.roles?.cache) {
    return memberOrUser.roles.cache.some(r => ids.includes(r.id));
  }
  return false;
}

async function refreshLive(bot) {
  try {
    await bot.modules?.hours?.livePanel?.update(bot);
  } catch (_) {}
}

function generalGuard(interaction) {
  if (!isGeneral(interaction.member ?? interaction.user)) {
    return {
      ok: false,
      payload: { content: "⛔ No tienes autorización del Alto Mando para ejecutar esta acción.", ephemeral: true }
    };
  }
  return { ok: true };
}

module.exports = {
  async openPanel(bot, interaction) {
    if (!isGeneral(interaction.member ?? interaction.user)) {
      return safeReply(interaction, {
        content: "⛔ No tienes autorización para acceder al Panel de Mando.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.embed)
      .setTitle(`🎖️ Panel de Mando Táctico — ${config.system.name}`)
      .setDescription("Centro de mando y administración militar de horas.\n\nSelecciona una operación del menú a continuación:")
      .setFooter({ text: config.system.footer });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("HOURS_GENERAL_MENU")
        .setPlaceholder("Selecciona una operación militar…")
        .addOptions([
          { label: "Ver soldados en servicio activo", value: "IN_SERVICE", emoji: "👁️" },
          { label: "Forzar salida de un soldado", value: "FORCE_OUT", emoji: "🛑" },
          { label: "Añadir horas manualmente", value: "ADD_HOURS", emoji: "➕" },
          { label: "Quitar horas manualmente", value: "REMOVE_HOURS", emoji: "➖" },
          { label: "Resetear horas de un soldado", value: "RESET_USER", emoji: "👤" },
          { label: "Resetear horas de TODOS (Peligro)", value: "RESET_ALL", emoji: "⚠️" },
          { label: "Historial semanal de un soldado", value: "HISTORY_WEEK", emoji: "📅" },
          { label: "Historial total de un soldado", value: "HISTORY_TOTAL", emoji: "📚" },
          { label: "Bloquear soldado (Suspender)", value: "BLOCK", emoji: "🚫" },
          { label: "Desbloquear soldado", value: "UNBLOCK", emoji: "✅" },
          { label: "Reporte semanal táctico", value: "WEEKLY_REPORT", emoji: "📘" }
        ])
    );

    return safeReply(interaction, { embeds: [embed], components: [row], ephemeral: true });
  },

  async handleGeneralMenu(bot, interaction) {
    const guard = generalGuard(interaction);
    if (!guard.ok) return safeReply(interaction, guard.payload);

    const db = bot.db;
    const option = interaction.values?.[0];
    if (!option) return safeReply(interaction, { content: "Operación no válida.", ephemeral: true });

    // 1) IN_SERVICE
    if (option === "IN_SERVICE") {
      const rows = await db.all("SELECT user_id, start, paused_at FROM hours_active ORDER BY start ASC");
      if (!rows.length) {
        return safeReply(interaction, { content: "No hay soldados en servicio actualmente.", ephemeral: true });
      }

      const desc = rows.map(r => {
        const estado = r.paused_at ? "⏸️ *En Pausa*" : "🟢 *Activo*";
        return `• <@${r.user_id}> — ${estado} desde ${rel(r.paused_at || r.start)}`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle("👁️ Contingente Actual en Servicio")
        .setDescription(desc)
        .setFooter({ text: config.system.footer });

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    // 2) RESET_ALL — Con diálogo de confirmación estricto
    if (option === "RESET_ALL") {
      const confirmEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle("⚠️ ALERTA DE SEGURIDAD: RESETEO TOTAL")
        .setDescription(
          "¿Estás absolutamente seguro de que deseas **ELIMINAR TODAS LAS HORAS Y TURNOS** de todo el servidor?\n\n" +
          "Esta acción es irreversible y vaciará el historial completo de todos los soldados."
        )
        .setFooter({ text: "Operación protegida del Alto Mando" });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("HOURS_CONFIRM_RESET_ALL")
          .setLabel("Confirmar Reseteo Total")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("HOURS_CANCEL_RESET_ALL")
          .setLabel("Cancelar Operación")
          .setStyle(ButtonStyle.Secondary)
      );

      return safeReply(interaction, { embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
    }

    // 3) WEEKLY_REPORT
    if (option === "WEEKLY_REPORT") {
      return weekly.generate(bot, false, interaction, true);
    }

    // 4) Operaciones con selector de usuario nativo (sin límite de 25)
    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`HOURS_GENERAL_TARGET_${option}`)
        .setPlaceholder("Busca o selecciona al soldado militar objetivo…")
    );

    return safeReply(interaction, {
      content: `🎯 **Paso 2:** Selecciona al soldado para la acción: **${option}**`,
      components: [userSelect],
      ephemeral: true
    });
  },

  async executeResetAll(bot, interaction) {
    const guard = generalGuard(interaction);
    if (!guard.ok) return safeReply(interaction, guard.payload);

    await bot.db.run("DELETE FROM hours_active");
    await bot.db.run("DELETE FROM hours_sessions");

    await logs.resetAll(bot, interaction.user);
    await refreshLive(bot);

    return safeReply(interaction, {
      content: "♻️ **Operación ejecutada:** Todas las horas y servicios activos han sido reseteados exitosamente.",
      components: [],
      embeds: [],
      ephemeral: true
    });
  },

  async cancelResetAll(bot, interaction) {
    return safeReply(interaction, {
      content: "✅ Operación de reseteo cancelada. Ningún dato fue alterado.",
      components: [],
      embeds: [],
      ephemeral: true
    });
  },

  async handleTargetSelect(bot, interaction) {
    const guard = generalGuard(interaction);
    if (!guard.ok) return safeReply(interaction, guard.payload);

    const db = bot.db;
    const action = interaction.customId.replace("HOURS_GENERAL_TARGET_", "");
    const userId = interaction.values?.[0];

    if (!userId) {
      return safeReply(interaction, { content: "No se seleccionó ningún soldado.", ephemeral: true });
    }

    // FORCE_OUT
    if (action === "FORCE_OUT") {
      const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);
      if (!active) {
        return safeReply(interaction, { content: `<@${userId}> no tiene un servicio activo.`, ephemeral: true });
      }

      const now = Date.now();
      let totalPausedMs = toInt(active.total_paused, 0);
      if (active.paused_at) totalPausedMs += Math.max(0, now - toInt(active.paused_at));

      let minutes = Math.max(0, Math.floor((now - toInt(active.start) - totalPausedMs) / 60000));
      const minMinutes = config.settings?.minSessionMinutes || 1;
      if (minutes < minMinutes) minutes = minMinutes;

      await db.run(
        'INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)',
        [userId, active.start, now, minutes]
      );
      await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);

      await logs.forceOut(bot, interaction.user, userId, minutes);
      await refreshLive(bot);

      const hm = minutesToHM(minutes);
      return safeReply(interaction, {
        content: `🛑 Salida forzada aplicada a <@${userId}>. Se registraron **${hm.text}**.`,
        ephemeral: true
      });
    }

    // ADD_HOURS / REMOVE_HOURS
    if (action === "ADD_HOURS" || action === "REMOVE_HOURS") {
      const modal = new ModalBuilder()
        .setCustomId(`MOD_HOURS_${action}:${userId}`)
        .setTitle(action === "ADD_HOURS" ? "Añadir Horas/Minutos" : "Quitar Horas/Minutos");

      const minutesInput = new TextInputBuilder()
        .setCustomId("TARGET_MINUTES")
        .setLabel("Cantidad de minutos a ajustar")
        .setPlaceholder("Ejemplo: 60 para 1 hora")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(minutesInput));
      return interaction.showModal(modal);
    }

    // RESET_USER
    if (action === "RESET_USER") {
      await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);
      await db.run("DELETE FROM hours_sessions WHERE user_id = ?", [userId]);

      await logs.resetUser(bot, interaction.user, userId);
      await refreshLive(bot);

      return safeReply(interaction, {
        content: `♻️ Se han reseteado todas las horas del soldado <@${userId}>.`,
        ephemeral: true
      });
    }

    // HISTORY_WEEK
    if (action === "HISTORY_WEEK") {
      const resetAt = await weekly.ensureMeta(bot);

      const rows = await db.all(
        "SELECT * FROM hours_sessions WHERE user_id = ? AND start >= ? ORDER BY start ASC",
        [userId, resetAt]
      );

      if (!rows.length) {
        return safeReply(interaction, {
          content: `<@${userId}> no tiene horas registradas en la semana actual.`,
          ephemeral: true
        });
      }

      let desc = "";
      let total = 0;

      for (const s of rows) {
        total += toInt(s.duration);
        const hm = minutesToHM(s.duration);
        desc += `• <t:${Math.floor(s.start / 1000)}:f> → ${hm.text}\n`;
      }

      const tHM = minutesToHM(total);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`📘 Historial Semanal — <@${userId}>`)
        .setDescription(desc.slice(0, 4000) + `\n**Total semanal acumulado:** ${tHM.text}`)
        .setFooter({ text: config.system.footer });

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    // HISTORY_TOTAL
    if (action === "HISTORY_TOTAL") {
      const rows = await db.all(
        "SELECT * FROM hours_sessions WHERE user_id = ? ORDER BY start ASC",
        [userId]
      );

      if (!rows.length) {
        return safeReply(interaction, { content: `<@${userId}> no tiene horas históricas registradas.`, ephemeral: true });
      }

      let desc = "";
      let total = 0;

      for (const s of rows) {
        total += toInt(s.duration);
        const hm = minutesToHM(s.duration);
        desc += `• <t:${Math.floor(s.start / 1000)}:f> → ${hm.text}\n`;
      }

      const tHM = minutesToHM(total);

      const embed = new EmbedBuilder()
        .setColor(config.colors.embed)
        .setTitle(`📚 Historial Total Histórico — <@${userId}>`)
        .setDescription(desc.slice(0, 4000) + `\n**Total histórico acumulado:** ${tHM.text}`)
        .setFooter({ text: config.system.footer });

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    // BLOCK
    if (action === "BLOCK") {
      await db.run(
        "INSERT INTO hours_blocked (user_id, reason, blocked_by, blocked_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason",
        [userId, "Bloqueado por orden de Mando", interaction.user.id, Date.now()]
      );
      await logs.block(bot, interaction.user, userId);

      return safeReply(interaction, {
        content: `🚫 <@${userId}> ha sido suspendido y bloqueado para entrar en servicio.`,
        ephemeral: true
      });
    }

    // UNBLOCK
    if (action === "UNBLOCK") {
      await db.run("DELETE FROM hours_blocked WHERE user_id = ?", [userId]);
      await logs.unblock(bot, interaction.user, userId);

      return safeReply(interaction, {
        content: `✅ <@${userId}> ha sido desbloqueado y puede volver a registrar servicio.`,
        ephemeral: true
      });
    }
  },

  async handleModal(bot, interaction) {
    const guard = generalGuard(interaction);
    if (!guard.ok) return safeReply(interaction, guard.payload);

    const db = bot.db;
    const raw = interaction.customId || "";
    if (!raw.startsWith("MOD_HOURS_")) return;

    const actionAndUser = raw.replace("MOD_HOURS_", "");
    const [action, userId] = actionAndUser.split(":");

    const minutesRaw = interaction.fields.getTextInputValue("TARGET_MINUTES");
    const minutes = parseInt(minutesRaw, 10);

    if (!minutes || Number.isNaN(minutes) || minutes <= 0) {
      return safeReply(interaction, {
        content: "La cantidad de minutos ingresada no es válida.",
        ephemeral: true
      });
    }

    const now = Date.now();

    if (action === "ADD_HOURS") {
      await db.run(
        'INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)',
        [userId, now, now, minutes]
      );

      await logs.manualAdd(bot, interaction.user, userId, minutes);

      return safeReply(interaction, {
        content: `➕ Se han añadido **${minutes} minutos** al expediente de <@${userId}>.`,
        ephemeral: true
      });
    }

    if (action === "REMOVE_HOURS") {
      const delta = -Math.abs(minutes);

      await db.run(
        'INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)',
        [userId, now, now, delta]
      );

      await logs.manualRemove(bot, interaction.user, userId, minutes);

      return safeReply(interaction, {
        content: `➖ Se han restado **${minutes} minutos** al expediente de <@${userId}>.`,
        ephemeral: true
      });
    }
  }
};
