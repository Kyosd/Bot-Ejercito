// modules/absences/events/interaction.js
"use strict";

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const service = require("../service");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        try {
            // ============================
            // BOTONES DEL PANEL DE AUSENCIAS
            // ============================
            if (interaction.isButton()) {
                if (interaction.customId === "ABSENCE_OPEN") {
                    const existing = await service.isAbsent(bot, interaction.user.id);
                    if (existing) {
                        return interaction.reply({
                            content: `<a:alert:1565453809038262432> Ya cuentas con una ausencia registrada activa:\n• **Motivo:** ${existing.reason}\n• **Retorno estimado:** ${existing.duration}\n\nSi deseas finalizarla o reincorporarte, pulsa el botón **Reincorporarme**.`,
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId("ABSENCE_MODAL")
                        .setTitle("Reporte de Ausencia Militar");

                    const reasonInput = new TextInputBuilder()
                        .setCustomId("absence_reason")
                        .setLabel("Motivo justificado")
                        .setPlaceholder("Ejemplo: Exámenes universitarios, viaje familiar, salud")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(100);

                    const durationInput = new TextInputBuilder()
                        .setCustomId("absence_duration")
                        .setLabel("Duración o fecha de retorno estimada")
                        .setPlaceholder("Ejemplo: 4 días / Hasta el domingo 8")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(50);

                    const detailsInput = new TextInputBuilder()
                        .setCustomId("absence_details")
                        .setLabel("Detalles u observaciones (opcional)")
                        .setPlaceholder("Cualquier indicación adicional para el Alto Mando")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                        .setMaxLength(500);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(reasonInput),
                        new ActionRowBuilder().addComponents(durationInput),
                        new ActionRowBuilder().addComponents(detailsInput)
                    );

                    return interaction.showModal(modal);
                }

                if (interaction.customId === "ABSENCE_END_MY") {
                    const active = await service.isAbsent(bot, interaction.user.id);
                    if (!active) {
                        return interaction.reply({
                            content: "<a:alert:1565453809038262432> No tienes ninguna ausencia activa en este momento. Tu estado operativo ya es normal.",
                            ephemeral: true
                        });
                    }

                    await service.endAbsence(bot, interaction.user.id);
                    return interaction.reply({
                        content: "<a:success:1563959567191244892> **Reincorporación completada con éxito.**\nSe ha dado por concluido tu periodo de inactividad militar. Ya tienes habilitado el acceso para entrar en guardia, arrestos y abastecimientos.",
                        ephemeral: true
                    });
                }
            }

            // ============================
            // ENVÍO DEL MODAL
            // ============================
            if (interaction.isModalSubmit() && interaction.customId === "ABSENCE_MODAL") {
                const reason = interaction.fields.getTextInputValue("absence_reason").trim();
                const duration = interaction.fields.getTextInputValue("absence_duration").trim();
                const details = interaction.fields.getTextInputValue("absence_details")?.trim();

                const combinedReason = details ? `${reason} (${details})` : reason;

                await service.createAbsence(bot, interaction.user, combinedReason, duration);

                return interaction.reply({
                    content: `<a:success:1563959567191244892> **Reporte de ausencia militar registrado.**\n\n• **Motivo:** ${reason}\n• **Retorno estimado:** \`${duration}\`\n\n <a:alert:1565453809038262432> *Recuerda: Mientras dure tu inactividad no podrás ingresar a servicio ni registrar procedimientos operativos. Cuando vuelvas a estar disponible, pulsa 'Reincorporarme' en el panel.*`,
                    ephemeral: true
                });
            }
        } catch (err) {
            console.error("[absences interaction] Error:", err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: "Ocurrió un error procesando tu solicitud de ausencia.",
                        ephemeral: true
                    });
                }
            } catch (_) {}
        }
    }
};
