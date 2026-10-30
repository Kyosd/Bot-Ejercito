"use strict";

const config = require("./config");
const dashboard = require("./dashboard");

async function getMeta(db, key) {
  const row = await db.get("SELECT value FROM hours_meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

async function setMeta(db, key, value) {
  await db.run(
    "INSERT INTO hours_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, String(value)]
  );
}

async function updateControlMessage(bot) {
  const channelId = config.channels.principal;
  if (!channelId) return;
  const channel = await bot.client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const messageId = await getMeta(bot.db, "hours_main_ui_messageId").catch(() => null);
  if (!messageId) return;
  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (!msg) return;

  const payload = await dashboard.buildControlPayload(bot);
  await msg.edit(payload);
}

async function updateLiveOnly(bot) {
  const liveId = config.channels.liveStatus;
  const principalId = config.channels.principal;
  if (!liveId || liveId === principalId || !config.livePanel?.enabled) return;

  const channel = await bot.client.channels.fetch(liveId).catch(() => null);
  if (!channel?.isTextBased()) return;

  let messageId = config.livePanel.messageId || await getMeta(bot.db, "hours_livePanel_messageId").catch(() => null);
  let msg = messageId ? await channel.messages.fetch(messageId).catch(() => null) : null;

  if (!msg) {
    msg = await channel.send({ content: "Sincronizando guardia..." });
    await setMeta(bot.db, "hours_livePanel_messageId", msg.id).catch(() => null);
  }

  const embed = await dashboard.buildRosterOnlyEmbed(bot);
  await msg.edit({ content: "", embeds: [embed] });
}

module.exports = {
  _interval: null,
  _busy: false,
  _pending: false,

  async init(bot) {
    if (!config.livePanel?.enabled) return;

    await this.update(bot);

    const seconds = Math.max(10, Number(config.livePanel.refreshSeconds) || 20);
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => this.update(bot), seconds * 1000);

    console.log(`[hours livePanel] Dashboard en vivo cada ${seconds}s.`);
  },

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  },

  async update(bot) {
    if (!config.livePanel?.enabled) return;
    if (this._busy) {
      this._pending = true;
      return;
    }
    this._busy = true;

    try {
      await updateControlMessage(bot);
      await updateLiveOnly(bot);
    } catch (e) {
      console.error("[hours livePanel] Error actualizando:", e);
    } finally {
      this._busy = false;
      if (this._pending) {
        this._pending = false;
        setTimeout(() => this.update(bot), 500);
      }
    }
  }
};
