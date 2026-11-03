// modules/absences/commands/ausenciaspanel.js
"use strict";

const { SlashCommandBuilder, ChannelType } = require("discord.js");
const coreConfig = require("../../../core/config");
const ui = require("../ui");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ausenciaspanel")
        .setDescription("Despliega el panel interactivo de ausencias e inactividades militares (Solo Mando)")
        .addChannelOption(opt =>
            opt.setName("canal")
                .setDescription("Canal de destino (por defecto el canal actual)")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ Solo el Alto Mando militar puede desplegar el panel de ausencias.",
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel("canal") || interaction.channel;
        await interaction.deferReply({ ephemeral: true });

        const sent = await ui.deploy(bot, channel);
        if (!sent) {
            return interaction.editReply({
                content: "❌ No se pudo desplegar el panel. Verifica los permisos del bot en el canal indicado."
            });
        }

        return interaction.editReply({
            content: `✅ Panel de ausencias militares desplegado correctamente en <#${channel.id}>.`
        });
    }
};
