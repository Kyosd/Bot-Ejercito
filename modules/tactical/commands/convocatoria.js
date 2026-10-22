// modules/tactical/commands/convocatoria.js
"use strict";

const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const coreConfig = require("../../../core/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("convocatoria")
        .setDescription("Emite un llamado oficial a filas / operativo táctico con confirmación de asistencia")
        .addStringOption(opt =>
            opt.setName("titulo")
                .setDescription("Título del evento u operativo (Ej: Patrullaje General, Entrenamiento Táctico)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("fecha")
                .setDescription("Fecha y hora de convocatoria (Ej: Hoy a las 20:00 CET)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("detalles")
                .setDescription("Instrucciones, armamento o detalles del despliegue")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ Solo el Alto Mando puede convocar operativos militares.",
                ephemeral: true
            });
        }

        const title = interaction.options.getString("titulo");
        const dateText = interaction.options.getString("fecha");
        const details = interaction.options.getString("detalles") || "Uniforme de gala/combate estándar reglamentario.";
        const generalTag = `<@${interaction.user.id}>`;

        // Responder primero para tener el contexto de canal
        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(`🚨 LLAMADO A FILAS — ${title.toUpperCase()}`)
            .setDescription(
                `Se ordena a todo el personal militar confirmar de inmediato su asistencia a la orden de despliegue.\n\n` +
                `📅 **Fecha / Hora:** ${dateText}\n` +
                `🎖️ **Convocado por:** ${generalTag}\n` +
                `📝 **Instrucciones:** ${details}\n\n` +
                `──────────────────────────\n` +
                `📊 **Estado del Contingente Confirmado:**\n` +
                `• ✅ **Presentes:** \`0\` efectivos\n` +
                `• ⏳ **Con Retraso:** \`0\` efectivos\n` +
                `• ❌ **Ausentes:** \`0\` efectivos`
            )
            .setFooter({ text: "Comando de Operaciones • Pulsa un botón para confirmar tu estado" })
            .setTimestamp();

        // Enviamos el mensaje en el canal
        const message = await interaction.editReply({
            embeds: [embed]
        });

        // Guardamos en la base de datos
        await bot.db.run(
            `
            INSERT INTO convocations (message_id, channel_id, title, description, date_text, created_by, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
        `,
            [message.id, interaction.channelId, title, details, dateText, interaction.user.id, Date.now()]
        );

        const convRow = await bot.db.get("SELECT id FROM convocations WHERE message_id = ?", [message.id]);
        const convId = convRow?.id || message.id;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`CONV_ATTEND_${convId}`)
                .setLabel("Asistiré")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`CONV_LATE_${convId}`)
                .setLabel("Llegaré tarde")
                .setEmoji("⏳")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`CONV_ABSENT_${convId}`)
                .setLabel("Ausente justificado")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId(`CONV_LIST_${convId}`)
                .setLabel("Ver Asistencias")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Secondary)
        );

        await message.edit({ components: [row] });
    }
};
