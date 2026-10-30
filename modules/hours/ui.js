"use strict";

const config = require("./config");
const service = require("./service");
const admin = require("./admin");
const dashboard = require("./dashboard");

const handlers = {
  HOURS_SERVICE_IN: (bot, i) => service.startService(bot, i),
  HOURS_SERVICE_PAUSE: (bot, i) => service.togglePause(bot, i),
  HOURS_SERVICE_OUT: (bot, i) => service.endService(bot, i),
  HOURS_MY_STATUS: (bot, i) => service.getMyStatus(bot, i),
  HOURS_GENERAL_PANEL: (bot, i) => admin.openPanel(bot, i),
  HOURS_CONFIRM_RESET_ALL: (bot, i) => admin.executeResetAll(bot, i),
  HOURS_CANCEL_RESET_ALL: (bot, i) => admin.cancelResetAll(bot, i)
};

module.exports = {
  async deploy(bot) {
    try {
      const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
      if (!guild) {
        console.log("[hours] Guild no encontrada. Revisa GUILD_ID.");
        return;
      }

      const channelId = config.channels.principal;
      if (!channelId) {
        console.log("[hours] channels.principal no está definido.");
        return;
      }

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.log("[hours] Canal principal no encontrado:", channelId);
        return;
      }

      const payload = await dashboard.buildControlPayload(bot);

      const metaRow = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'hours_main_ui_messageId'").catch(() => null);
      let existingMsg = null;

      if (metaRow?.value) {
        existingMsg = await channel.messages.fetch(metaRow.value).catch(() => null);
      }

      if (existingMsg) {
        await existingMsg.edit(payload);
        console.log("[hours] Dashboard actualizado:", existingMsg.id);
      } else {
        const sent = await channel.send(payload);
        await bot.db.run(
          "INSERT INTO hours_meta (key, value) VALUES ('hours_main_ui_messageId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [sent.id]
        );
        console.log("[hours] Dashboard desplegado:", sent.id);
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
