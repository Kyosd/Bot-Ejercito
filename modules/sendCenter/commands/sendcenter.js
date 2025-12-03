// modules/sendCenter/commands/sendcenter.js
const { SlashCommandBuilder, ChannelType } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sendcenter")
        .setDescription("Enviar un mensaje oficial a un canal específico")
        .addChannelOption(opt =>
            opt.setName("canal")
                .setDescription("Canal de destino del mensaje")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(bot, interaction) {
        const channel = interaction.options.getChannel("canal");
        return bot.modules.sendCenter.start(bot, interaction, channel.id);
    }
};
