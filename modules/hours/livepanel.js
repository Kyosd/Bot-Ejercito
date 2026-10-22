"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const { rel, ts } = require("./utils");

async function ensureMetaTable(db) {
  await db.run("CREATE TABLE IF NOT EXISTS hours_meta (key TEXT PRIMARY KEY, value TEXT)");
}

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

async function fetchGuild(bot) {
  return bot.client.guilds.fetch(config.guildId).catch(() => null);
}

async function fetchLiveChannel(bot) {
  const channelId = config.channels.liveStatus;
  if (!channelId) return null;

  const guild = await fetchGuild(bot);
  if (!guild) return null;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  return channel;
}

module.exports = {
  _interval: null,
  _busy: false,
  _pending: false,

  async init(bot) {
    if (!config.livePanel?.enabled) return;

    await ensureMetaTable(bot.db).catch(() => null);

    await this.update(bot);

    const seconds = Math.max(10, Number(config.livePanel.refreshSeconds) || 30);

    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => this.update(bot), seconds * 1000);

    console.log(`[hours livePanel] Iniciado (refresh cada ${seconds}s).`);
  },

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  },

  async _getOrCreateMessage(bot) {
    const channel = await fetchLiveChannel(bot);
    if (!channel) return null;

    let messageId = config.livePanel.messageId || null;

    if (!messageId) {
      messageId = await getMeta(bot.db, "hours_livePanel_messageId").catch(() => null);
    }

    if (messageId) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) return msg;
      console.warn("[hours livePanel] MessageId guardado no existe. Creando nuevo...");
    }

    const created = await channel.send({ content: "📌 Iniciando panel de servicio táctico..." });
    await setMeta(bot.db, "hours_livePanel_messageId", created.id).catch(() => null);

    console.log("[hours livePanel] ✅ Panel en vivo creado con ID:", created.id);
    return created;
  },

  async _buildEmbed(bot) {
    const rows = await bot.db.all(
      "SELECT user_id, start, paused_at FROM hours_active ORDER BY start ASC",
      []
    );

    let activeCount = 0;
    let pausedCount = 0;

    const list = rows?.length
      ? rows.map((r) => {
          const who = config.livePanel.mentionUsers ? `<@${r.user_id}>` : r.user_id;
          const startMs = Number(r.start) || Date.now();

          if (r.paused_at) {
            pausedCount++;
            return `⏸️ ${who} — *En Pausa* (${rel(Number(r.paused_at))})`;
          }

          activeCount++;
          const extra = config.livePanel.showSince
            ? ` — inició ${rel(startMs)} (${ts(startMs, "t")})`
            : "";
          return `🟢 ${who}${extra}`;
        })
      : ["Actualmente no hay ningún miembro en servicio activo."];

    return new EmbedBuilder()
      .setColor(config.colors.ui)
      .setTitle("🔴 Personal Militar en Servicio Táctico")
      .setDescription(list.join("\n"))
      .addFields([
        { name: "Efectivos Activos", value: `${activeCount}`, inline: true },
        { name: "Efectivos en Pausa", value: `${pausedCount}`, inline: true },
        { name: "Total en Guardia", value: `${rows?.length || 0}`, inline: true }
      ])
      .setFooter({ text: `Última sincronización • ${new Date().toLocaleTimeString("es-ES")}` });
  },

  async update(bot) {
    if (!config.livePanel?.enabled) return;

    if (this._busy) {
      this._pending = true;
      return;
    }
    this._busy = true;

    try {
      const msg = await this._getOrCreateMessage(bot);
      if (!msg) return;

      const embed = await this._buildEmbed(bot);
      await msg.edit({ content: "", embeds: [embed] });
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
