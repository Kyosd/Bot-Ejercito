// modules/absences/ui.js
"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const config = require("./config");
const service = require("./service");

async function buildPayload(bot) {
    const activeList = await service.getActiveAbsences(bot);

    let desc = "";
    if (activeList.length === 0) {
        desc = "✅ **Todo el contingente militar se encuentra disponible para servicio activo.**\nNo hay reportes de ausencia vigentes.";
    } else {
        const lines = activeList.map((a, i) => {
            const startTs = Math.floor(Number(a.start_date) / 1000);
            return `**${i + 1}.** <@${a.user_id}> — **${a.reason}**\n   └ ⏳ *Retorno estimado:* \`${a.duration}\` · *Desde:* <t:${startTs}:R>`;
        });
        desc = lines.join("\n\n");
    }

    const embed = new EmbedBuilder()
        .setColor(config.colors.ui)
        .setTitle("📋 REGISTRO OFICIAL DE AUSENCIAS E INACTIVIDAD MILITAR")
        .setDescription(
            "Reporta aquí tus periodos de inactividad justificada (viajes, estudios, salud) para evitar sanciones disciplinarias por inasistencia.\n\n" +
            "🔒 **Regla Operativa:**\n" +
            "Mientras tengas un registro de ausencia activo, **el sistema no te permitirá iniciar servicio de guardia, registrar arrestos ni despachar abastecimientos.**\n\n" +
            "────────────────────────────────────────\n" +
            "**Soldados actualmente con permiso / inactivos:**\n\n" +
            desc
        )
        .setFooter({ text: "Comando de Personal • Ejército Nacional" })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("ABSENCE_OPEN")
            .setLabel("Reportar Ausencia")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("ABSENCE_END_MY")
            .setLabel("Reincorporarme")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    buildPayload,

    async deploy(bot, channelOverride = null) {
        try {
            const channelId = channelOverride?.id || config.panelChannel;
            if (!channelId) return;

            const channel = channelOverride || await bot.client.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            const payload = await buildPayload(bot);
            const metaRow = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'absences_panel_messageId'").catch(() => null);
            let existing = null;

            if (metaRow?.value) {
                existing = await channel.messages.fetch(metaRow.value).catch(() => null);
            }

            if (existing) {
                await existing.edit(payload);
                return existing;
            }

            const sent = await channel.send(payload);
            await bot.db.run(
                "INSERT INTO hours_meta (key, value) VALUES ('absences_panel_messageId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [sent.id]
            );
            return sent;
        } catch (err) {
            console.error("[absences ui] Error desplegando panel:", err);
        }
    },

    async update(bot) {
        try {
            const metaRow = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'absences_panel_messageId'").catch(() => null);
            if (!metaRow?.value) return;

            const channelId = config.panelChannel;
            if (!channelId) return;

            const channel = await bot.client.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            const msg = await channel.messages.fetch(metaRow.value).catch(() => null);
            if (!msg) return;

            const payload = await buildPayload(bot);
            await msg.edit(payload);
        } catch (err) {
            console.error("[absences ui] Error actualizando panel:", err);
        }
    }
};
