"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const { ts } = require("./utils");

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.log)
    .setFooter({ text: config.system.footer })
    .setTimestamp(Date.now());
}

async function send(bot, embed) {
  const channelId = config.channels.logs;
  if (!channelId) return;

  try {
    const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[hours logs] Error enviando log:", err);
  }
}

module.exports = {
  async serviceIn(bot, user, startMs) {
    const e = baseEmbed()
      .setTitle("<:active:1565445915781763336> Servicio iniciado")
      .setDescription(
        `**Usuario:** <@${user.id}> (${user.id})\n` +
        `**Inicio:** ${ts(startMs, "F")}`
      );
    await send(bot, e);
  },

  async serviceOut(bot, user, startMs, endMs, minutes, total, weekly) {
    const e = baseEmbed()
      .setTitle("<:exit:1565446798586282165> Servicio finalizado")
      .setDescription(
        `**Usuario:** <@${user.id}> (${user.id})\n\n` +
        `**Turno:**\n` +
        `• Inicio: ${ts(startMs, "F")}\n` +
        `• Fin: ${ts(endMs, "F")}\n` +
        `• Minutos: ${minutes}\n\n` +
        `**Acumulado:**\n` +
        `• Semana: ${weekly}\n` +
        `• Total histórico: ${total}`
      );
    await send(bot, e);
  },

  async forceOut(bot, executor, targetId, minutes) {
    const e = baseEmbed()
      .setTitle("<a:warning:1565451290367107092> Salida forzada")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Objetivo:** <@${targetId}>\n` +
        `**Minutos registrados:** ${minutes}`
      );
    await send(bot, e);
  },

  async manualAdd(bot, executor, targetId, minutes) {
    const e = baseEmbed()
      .setTitle("<:plus:1565461915306565784> Horas añadidas manualmente")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Objetivo:** <@${targetId}>\n` +
        `**Minutos añadidos:** ${minutes}`
      );
    await send(bot, e);
  },

  async manualRemove(bot, executor, targetId, minutes) {
    const e = baseEmbed()
      .setTitle("<:minus:1565467203623460934> Horas restadas manualmente")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Objetivo:** <@${targetId}>\n` +
        `**Minutos restados:** ${minutes}`
      );
    await send(bot, e);
  },

  async resetUser(bot, executor, targetId) {
    const e = baseEmbed()
      .setTitle("<:reset:1565467886745813205> Reset de usuario")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Objetivo:** <@${targetId}>`
      );
    await send(bot, e);
  },

  async resetAll(bot, executor) {
    const e = baseEmbed()
      .setTitle("<:warning:1565451290367107092> Reset total")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `Todos los registros han sido borrados.`
      );
    await send(bot, e);
  },

  async block(bot, executor, targetId) {
    const e = baseEmbed()
      .setTitle("<:blocked:1565457686806397093> Usuario bloqueado")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Bloqueado:** <@${targetId}>`
      );
    await send(bot, e);
  },

  async unblock(bot, executor, targetId) {
    const e = baseEmbed()
      .setTitle("<:unblocked:1565445915781763336> Usuario desbloqueado")
      .setDescription(
        `**Ejecutor:** <@${executor.id}>\n` +
        `**Desbloqueado:** <@${targetId}>`
      );
    await send(bot, e);
  },

  async weeklyReport(bot, auto, executor = null) {
    const e = baseEmbed()
      .setTitle("<a:escribiendo:1563959662003622014> Reporte semanal generado")
      .setDescription(
        auto
          ? "Reporte generado automáticamente."
          : `Reporte generado manualmente por <@${executor.id}>.`
      );
    await send(bot, e);
  }
};
