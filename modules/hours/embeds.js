"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");
const { minutesToHM, ts } = require("./utils");

module.exports = {
  serviceIn(user, startMs, totalMinutes, weeklyMinutes) {
    const total = minutesToHM(totalMinutes);
    const week = minutesToHM(weeklyMinutes);

    return new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle("<:active:1565445915781763336> En servicio")
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setDescription(`<@${user.id}> inició guardia.`)
      .addFields(
        { name: "Entrada", value: `${ts(startMs, "F")}\n${ts(startMs, "R")}`, inline: true },
        { name: "Semana", value: `**${week.text}**`, inline: true },
        { name: "Histórico", value: `**${total.text}**`, inline: true }
      )
      .setFooter({ text: config.system.footer })
      .setTimestamp(startMs);
  },

  serviceOut(user, startMs, endMs, sessionMinutes, totalMinutes, weeklyMinutes) {
    const ses = minutesToHM(sessionMinutes);
    const total = minutesToHM(totalMinutes);
    const week = minutesToHM(weeklyMinutes);

    return new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle("<a:exit:1565446798586282165> Servicio cerrado")
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setDescription(`<@${user.id}> finalizó su turno.`)
      .addFields(
        { name: "Inicio", value: ts(startMs, "t"), inline: true },
        { name: "Fin", value: ts(endMs, "t"), inline: true },
        { name: "Duración neta", value: `**${ses.text}**`, inline: true },
        { name: "Semana", value: `**${week.text}**`, inline: true },
        { name: "Histórico", value: `**${total.text}**`, inline: true }
      )
      .setFooter({ text: config.system.footer })
      .setTimestamp(endMs);
  }
};
