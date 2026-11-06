"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: "ready",

    async execute(bot) {

        try {

            const panelChannelId =
                process.env.TACTICAL_PANEL_CHANNEL_ID;

            if (!panelChannelId) {
                return console.log(
                    "[tactical] TACTICAL_PANEL_CHANNEL_ID no configurado."
                );
            }

            const channel =
                await bot.client.channels.fetch(panelChannelId);

            if (!channel) {
                return console.log(
                    "[tactical] Canal del panel no encontrado."
                );
            }

            const embed = new EmbedBuilder()
                .setColor("#8B0000")
                .setTitle("<:members:1565472624921018491> CENTRAL DE OPERACIONES TÁCTICAS")
                .setDescription(
`**Panel Oficial de Convocatorias Militares**

Desde esta terminal el Alto Mando podrá emitir órdenes de despliegue inmediato para todas las unidades activas.

━━━━━━━━━━━━━━━━━━━━━━

<:operation:1568248300443017378> Convocatoria General

<:city:1568249830239633468> Protección de la Ciudad

<:support:1567962392921505963> Apoyo Operacional

<:helper:1565445915781763336> Refuerzo de Servicios

<a:siren:1568246186702274733> Respuesta ante Emergencias

━━━━━━━━━━━━━━━━━━━━━━

<a:online:1565448013218848949> Estado del Sistema: OPERATIVO

Presione el botón inferior para emitir una convocatoria oficial.`
                )
                .setFooter({
                    text: "Estado Mayor • Ejército Nacional"
                })
                .setTimestamp();

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("TACTICAL_DEPLOY")
                            .setEmoji("<a:siren:1568246186702274733>")
                            .setLabel("Emitir Convocatoria")
                            .setStyle(ButtonStyle.Danger)
                    );

            const messages =
                await channel.messages.fetch({
                    limit: 50
                });

            const panel =
                messages.find(
                    m =>
                        m.author.id === bot.client.user.id &&
                        m.components.length > 0 &&
                        m.components[0].components.some(
                            c =>
                                c.customId ===
                                "TACTICAL_DEPLOY"
                        )
                );

            if (panel) {

                await panel.edit({
                    embeds: [embed],
                    components: [row]
                });

                console.log(
                    "[tactical] Panel actualizado."
                );

            } else {

                await channel.send({
                    embeds: [embed],
                    components: [row]
                });

                console.log(
                    "[tactical] Panel creado."
                );

            }

        } catch (error) {

            console.error(
                "[tactical] Error creando panel:",
                error
            );

        }

    }
};