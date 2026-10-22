// modules/tickets/commands/ticket.js
"use strict";

const { SlashCommandBuilder } = require("discord.js");
const service = require("../service");
const coreConfig = require("../../../core/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Comandos de gestión interna para tickets")
        .addSubcommand(sub =>
            sub.setName("close")
                .setDescription("Cierra el ticket actual")
                .addStringOption(opt =>
                    opt.setName("razon")
                        .setDescription("Motivo del cierre")
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName("claim")
                .setDescription("Reclama la atención de este ticket")
        )
        .addSubcommand(sub =>
            sub.setName("add")
                .setDescription("Añade a un usuario o soldado al ticket actual")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuario a añadir")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remueve a un usuario del ticket actual")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuario a remover")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("transcript")
                .setDescription("Genera y descarga la transcripción actual del ticket")
        ),

    async execute(bot, interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "close") {
            const reason = interaction.options.getString("razon") || "Cerrado mediante comando /ticket close";
            return service.requestClose(bot, interaction);
        }

        if (sub === "claim") {
            return service.claimTicket(bot, interaction);
        }

        if (sub === "add") {
            if (!coreConfig.isGeneral(interaction.member)) {
                return interaction.reply({ content: "⛔ Solo el personal autorizado puede añadir miembros al ticket.", ephemeral: true });
            }
            const target = interaction.options.getUser("usuario");
            return service.addUser(bot, interaction, target);
        }

        if (sub === "remove") {
            if (!coreConfig.isGeneral(interaction.member)) {
                return interaction.reply({ content: "⛔ Solo el personal autorizado puede expulsar miembros del ticket.", ephemeral: true });
            }
            const target = interaction.options.getUser("usuario");
            return service.removeUser(bot, interaction, target);
        }

        if (sub === "transcript") {
            await interaction.deferReply({ ephemeral: true });
            const ticket = await bot.db.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channelId]);
            const attachment = await service.generateTranscript(interaction.channel, ticket);
            return interaction.editReply({
                content: "📋 **Aquí tienes la transcripción del ticket:**",
                files: [attachment]
            });
        }
    }
};
