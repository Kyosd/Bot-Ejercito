"use strict";

const { SlashCommandBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const service = require("../service");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verificacionpanel")
        .setDescription("Publica o actualiza el panel de verificación (Alto Mando)")
        .addChannelOption(opt =>
            opt.setName("canal")
                .setDescription("Canal donde se publicará el panel")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "<:forbidden:1568246186702274733> Solo el Alto Mando puede desplegar el panel de verificación.",
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel("canal") || interaction.channel;
        if (!channel?.isTextBased()) {
            return interaction.reply({ content: "Elige un canal de texto.", ephemeral: true });
        }

        await service.deployPanel(bot, channel);
        return interaction.reply({
            content: `<a:check:1563959567191244892> Panel de verificación listo en ${channel}.`,
            ephemeral: true
        });
    }
};
