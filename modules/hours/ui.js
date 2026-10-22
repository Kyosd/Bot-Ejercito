"use strict";

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config");
const service = require("./service");
const admin = require("./admin");

const handlers = {
  HOURS_SERVICE_IN: (bot, i) => service.startService(bot, i),
  HOURS_SERVICE_PAUSE: (bot, i) => service.togglePause(bot, i),
  HOURS_SERVICE_OUT: (bot, i) => service.endService(bot, i),
  HOURS_GENERAL_PANEL: (bot, i) => admin.openPanel(bot, i),
  HOURS_CONFIRM_RESET_ALL: (bot, i) => admin.executeResetAll(bot, i),
  HOURS_CANCEL_RESET_ALL: (bot, i) => admin.cancelResetAll(bot, i)
};

module.exports = {
  async deploy(bot) {
    try {
      const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
      if (!guild) {
        console.log("[hours] Guild no encontrada. Revisa guildId en config.js");
        return;
      }

      const channelId = config.channels.principal;
      if (!channelId) {
        console.log("[hours] channels.principal no está definido en config.js");
        return;
      }

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.log("[hours] Canal principal no encontrado o no es de texto:", channelId);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.ui)
        .setTitle(`📋 Control de Servicio — ${config.system.name}`)
        .setDescription(
          "Sistema oficial para registrar las horas de servicio militar.\n\n" +
          "🔹 **Entrar en servicio** — Inicia tu turno táctico y activa tu guardia.\n" +
          "⏸️ **Pausa / Descanso** — Pausa tu turno temporalmente para no inflar horas AFK.\n" +
          "🔹 **Salir de servicio** — Finaliza tu turno y registra tus horas efectivas.\n" +
          "🔹 **Panel de Generales** — Acceso exclusivo al Alto Mando para gestión táctica.\n\n" +
          "⚠️ *Recuerda marcar siempre tu entrada y salida formalmente.*"
        )
        .setFooter({ text: config.system.footer });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("HOURS_SERVICE_IN")
          .setLabel("Entrar en servicio")
          .setEmoji("🟢")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("HOURS_SERVICE_PAUSE")
          .setLabel("Pausa / Reanudar")
          .setEmoji("⏸️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("HOURS_SERVICE_OUT")
          .setLabel("Salir de servicio")
          .setEmoji("🔴")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("HOURS_GENERAL_PANEL")
          .setLabel("Panel de Mando")
          .setEmoji("🎖️")
          .setStyle(ButtonStyle.Primary)
      );

      // Verificamos si ya existe el mensaje guardado en la base de datos
      const metaRow = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'hours_main_ui_messageId'").catch(() => null);
      let existingMsg = null;

      if (metaRow?.value) {
        existingMsg = await channel.messages.fetch(metaRow.value).catch(() => null);
      }

      if (existingMsg) {
        await existingMsg.edit({ embeds: [embed], components: [row] });
        console.log("[hours] UI actualizada exitosamente en mensaje existente:", existingMsg.id);
      } else {
        const sent = await channel.send({ embeds: [embed], components: [row] });
        await bot.db.run(
          "INSERT INTO hours_meta (key, value) VALUES ('hours_main_ui_messageId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [sent.id]
        );
        console.log("[hours] UI principal desplegada y guardada con ID:", sent.id);
      }
    } catch (err) {
      console.error("[hours] Error en deploy UI:", err);
    }
  },

  async route(bot, interaction) {
    const fn = handlers[interaction.customId];
    if (!fn) return;
    return fn(bot, interaction);
  }
};
