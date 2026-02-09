"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const { minutesToHM, ts } = require("./utils");

module.exports = {
  serviceIn(user, startMs, totalMinutes, weeklyMinutes) {
    const total = minutesToHM(totalMinutes);
    const week = minutesToHM(weeklyMinutes);

    return new EmbedBuilder()
      .setColor(config.colors.embed)
      .setTitle(`🔰 Servicio Iniciado — ${config.system.name}`)
      .setDescription(
        `**Operador:** <@${user.id}>\n` +
        `**Entrada:** ${ts(startMs, "F")}\n\n` +
        `**Estado de horas:**\n` +
        `• Semana actual: **${week.h}h ${week.m}m**\n` +
        `• Histórico total: **${total.h}h ${total.m}m**\n\n` +
        `Mantenga la disciplina en el servicio.`
      )
      .setFooter({ text: config.system.footer });
  },

  serviceOut(user, startMs, endMs, sessionMinutes, totalMinutes, weeklyMinutes) {
    const ses = minutesToHM(sessionMinutes);
    const total = minutesToHM(totalMinutes);
    const week = minutesToHM(weeklyMinutes);

    return new EmbedBuilder()
      .setColor(config.colors.embed)
      .setTitle(`🔰 Servicio Finalizado — ${config.system.name}`)
      .setDescription(
        `**Operador:** <@${user.id}>\n\n` +
        `**Turno actual:**\n` +
        `• Inicio: ${ts(startMs, "t")}\n` +
        `• Fin: ${ts(endMs, "t")}\n` +
        `• Duración: **${ses.h}h ${ses.m}m**\n\n` +
        `**Estado de horas:**\n` +
        `• Semana actual: **${week.h}h ${week.m}m**\n` +
        `• Histórico total: **${total.h}h ${total.m}m**\n\n` +
        `Buen trabajo. Espere nuevas órdenes.`
      )
      .setFooter({ text: config.system.footer });
  }
};
