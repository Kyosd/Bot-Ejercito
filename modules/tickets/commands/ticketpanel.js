// modules/tickets/commands/ticketpanel.js
"use strict";

const {
    SlashCommandBuilder,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");

const coreConfig = require("../../../core/config");
const ticketConfig = require("../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticketpanel")
        .setDescription("Despliega el panel oficial de tickets y atención militar (Solo Mando)")
        .addChannelOption(opt =>
            opt.setName("canal")
                .setDescription("Canal donde se desplegará el panel de tickets")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "<:forbidden:1568246186702274733> No tienes autorización del Alto Mando para desplegar el panel de tickets.",
                ephemeral: true
            });
        }

        const targetChannel = interaction.options.getChannel("canal") || interaction.channel;

        const options = ticketConfig.categories.map(cat => ({
            label: cat.label,
            value: `ticket_cat_${cat.id}`,
            description: cat.description.slice(0, 100),
            emoji: cat.emoji
        }));

        const embed = new EmbedBuilder()
            .setColor(ticketConfig.colors.embed)
            .setTitle("<:tickets:1567998576641056900> Centro de Atención y Soporte Militar")
            .setDescription(
                "Bienvenido al canal oficial de solicitudes y asistencia del **Ejército Nacional**.\n\n" +
                "Selecciona en el menú desplegable inferior el departamento o motivo por el cual deseas contactar a nuestro personal de guardia:\n\n" +
                ticketConfig.categories.map(c => `${c.emoji} **${c.label}**\n*${c.description}*`).join("\n\n") +
                "\n\n<a:alert:1565453809038262432> *Evita abrir tickets sin justificación. Todo abuso del sistema será sancionado.*"
            )
            .setFooter({ text: "Comando Central de Guardia • Atención Personalizada" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("TICKET_SELECT_CATEGORY")
                .setPlaceholder("Selecciona una categoría de atención…")
                .addOptions(options)
        );

        await targetChannel.send({ embeds: [embed], components: [row] });

        return interaction.reply({
            content: `<a:check:1563959567191244892> Panel de tickets desplegado exitosamente en <#${targetChannel.id}>.`,
            ephemeral: true
        });
    }
};
