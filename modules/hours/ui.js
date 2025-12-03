"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const config  = require("./config");
const service = require("./service");
const admin   = require("./admin");

module.exports = {

    async deploy(bot) {
        try {
            const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
            if (!guild) {
                console.log("[hours] Guild no encontrada. Revisa guildId en modules/hours/config.js");
                return;
            }

            const channelId = config.channels.principal;
            if (!channelId) {
                console.log("[hours] channels.principal no está definido en config.js");
                return;
            }

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                console.log("[hours] Canal principal de horas no encontrado:", channelId);
                return;
            }

            // Borrar mensajes anteriores del bot en ese canal
            try {
                const msgs = await channel.messages.fetch({ limit: 50 });
                const own  = msgs.filter(m => m.author.id === bot.client.user.id);
                if (own.size > 0) await channel.bulkDelete(own, true);
            } catch (e) {
                console.log("[hours] No se pudieron borrar mensajes antiguos (no crítico):", e.message);
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.ui)
                .setTitle(`📋 Control de Servicio — ${config.system.name}`)
                .setDescription(
                    "Sistema oficial para registrar las horas de servicio.\n\n" +
                    "🔹 **Entrar en servicio** — Inicia tu turno táctico.\n" +
                    "🔹 **Salir de servicio** — Finaliza tu turno y registra tus horas.\n" +
                    "🔹 **Panel de Generales** — Acceso restringido a mandos autorizados.\n\n" +
                    "Recuerda marcar siempre tu entrada y salida."
                )
                .setFooter({ text: config.system.footer });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("HOURS_SERVICE_IN")
                    .setLabel("Entrar en servicio")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("HOURS_SERVICE_OUT")
                    .setLabel("Salir de servicio")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("HOURS_GENERAL_PANEL")
                    .setLabel("Panel de Generales")
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [embed], components: [row] });
            console.log("[hours] UI desplegada en canal principal.");
        } catch (err) {
            console.error("[hours] Error en deploy UI:", err);
        }
    },

    async route(bot, interaction) {
        const id = interaction.customId;

        if (id === "HOURS_SERVICE_IN") {
            return service.startService(bot, interaction);
        }
        if (id === "HOURS_SERVICE_OUT") {
            return service.endService(bot, interaction);
        }
        if (id === "HOURS_GENERAL_PANEL") {
            return admin.openPanel(bot, interaction);
        }
    }
};
