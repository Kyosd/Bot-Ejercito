"use strict";

const { EmbedBuilder } = require("discord.js");
const config = require("./config");

module.exports = {

    serviceIn(user, startMs, totalMinutes, weeklyMinutes) {
        totalMinutes = Number(totalMinutes) || 0;
        weeklyMinutes = Number(weeklyMinutes) || 0;

        const totalH = Math.floor(totalMinutes / 60);
        const totalM = totalMinutes % 60;
        const weekH  = Math.floor(weeklyMinutes / 60);
        const weekM  = weeklyMinutes % 60;

        return new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(`🔰 Servicio Iniciado — ${config.system.name}`)
            .setDescription(
                `**Operador:** <@${user.id}>\n` +
                `**Entrada:** <t:${Math.floor(startMs / 1000)}:F>\n\n` +
                `**Estado de horas:**\n` +
                `• Semana actual: **${weekH}h ${weekM}m**\n` +
                `• Histórico total: **${totalH}h ${totalM}m**\n\n` +
                `Mantenga la disciplina en el servicio.`
            )
            .setFooter({ text: config.system.footer });
    },

    serviceOut(user, startMs, endMs, sessionMinutes, totalMinutes, weeklyMinutes) {
        sessionMinutes = Number(sessionMinutes) || 0;
        totalMinutes   = Number(totalMinutes)   || 0;
        weeklyMinutes  = Number(weeklyMinutes)  || 0;

        const sesH = Math.floor(sessionMinutes / 60);
        const sesM = sessionMinutes % 60;

        const totalH = Math.floor(totalMinutes / 60);
        const totalM = totalMinutes % 60;

        const weekH  = Math.floor(weeklyMinutes / 60);
        const weekM  = weeklyMinutes % 60;

        return new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(`🔰 Servicio Finalizado — ${config.system.name}`)
            .setDescription(
                `**Operador:** <@${user.id}>\n\n` +
                `**Turno actual:**\n` +
                `• Inicio: <t:${Math.floor(startMs / 1000)}:t>\n` +
                `• Fin: <t:${Math.floor(endMs / 1000)}:t>\n` +
                `• Duración: **${sesH}h ${sesM}m**\n\n` +
                `**Estado de horas:**\n` +
                `• Semana actual: **${weekH}h ${weekM}m**\n` +
                `• Histórico total: **${totalH}h ${totalM}m**\n\n` +
                `Buen trabajo. Espere nuevas órdenes.`
            )
            .setFooter({ text: config.system.footer });
    }
};
