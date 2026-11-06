"use strict";

const {
    EmbedBuilder
} = require("discord.js");

const coreConfig =
    require("../../../core/config");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {

        if (!interaction.isButton()) return;

        if (
            interaction.customId !==
            "TACTICAL_DEPLOY"
        ) return;

        if (
            !coreConfig.isGeneral(
                interaction.member
            )
        ) {
            return interaction.reply({
                content:
                    "<:forbidden:1568246186702274733> No tienes autorización del Alto Mando.",
                ephemeral: true
            });
        }

        try {

            const alertChannelId =
                process.env
                    .TACTICAL_ALERT_CHANNEL_ID;

            const roleId =
                process.env
                    .TACTICAL_ROLE_ID;

            const channel =
                await bot.client.channels.fetch(
                    alertChannelId
                );

            if (!channel) {

                return interaction.reply({
                    content:
                        "❌ Canal de despliegue no configurado.",
                    ephemeral: true
                });

            }

            const embed =
                new EmbedBuilder()
                    .setColor("#ff0000")

                    .setTitle(
                        "<a:siren:1568246186702274733> ACTIVACIÓN GENERAL DE FUERZAS <a:siren:1568246186702274733>"
                    )

                    .setDescription(
`# <a:alert:1565453809038262432> LLAMADO OFICIAL DEL ALTO MANDO

Se ordena la incorporación inmediata de todas las unidades disponibles para servicio activo.

━━━━━━━━━━━━━━━━━━━━━━

<:operation:1568248300443017378> OPERACIÓN
MOVILIZACIÓN GENERAL

<:alert:1565453809038262432> NIVEL DE ALERTA
CRÍTICO

<:status:1565445915781763336> ESTADO
DESPLIEGUE ACTIVO

🎖 AUTORIZADO POR
<@${interaction.user.id}>

━━━━━━━━━━━━━━━━━━━━━━

Todo miembro disponible deberá reportarse de inmediato.

El personal deberá permanecer atento a nuevas directrices emitidas por el Alto Mando.

La inasistencia injustificada podrá derivar en acciones disciplinarias conforme al reglamento militar.

<:division:1567999300116414494> DIOS Y PATRIA

━━━━━━━━━━━━━━━━━━━━━━`
                    )
                    .setFooter({
                        text:
                            "Estado Mayor • Ejército Nacional"
                    })
                    .setTimestamp();

            await channel.send({

                content:
                    roleId
                        ? `<@&${roleId}>`
                        : undefined,

                embeds: [embed]

            });

            await interaction.reply({

                content:
                    "<a:check:1563959567191244892> Convocatoria emitida exitosamente.",

                ephemeral: true

            });

        } catch (error) {

            console.error(
                "[tactical]",
                error
            );

            if (!interaction.replied) {

                await interaction.reply({
                    content:
                        "<:forbidden:1568246186702274733> Ocurrió un error al emitir la convocatoria.",
                    ephemeral: true
                });

            }

        }

    }
};