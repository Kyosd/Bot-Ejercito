// modules/tickets/events/interaction.js
"use strict";

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const service = require("../service");
const panelManager = require("../panelManager");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        try {
            // ========================================================
            // 0. AUTOCOMPLETE PARA COMANDOS /panel
            // ========================================================
            if (interaction.isAutocomplete()) {
                if (interaction.commandName === "panel") {
                    const panelCmd = bot.client.commands.get("panel");
                    if (panelCmd?.autocomplete) {
                        return await panelCmd.autocomplete(bot, interaction);
                    }
                }
                return;
            }

            // ========================================================
            // 1. SELECT MENUS: APERTURA EXCLUSIVA MEDIANTE STRING SELECT MENU
            // ========================================================
            if (interaction.isStringSelectMenu()) {
                const customId = interaction.customId || "";

                // Menú desplegable institucional: PANEL_SELECT_{panelId}_{chunkIndex}
                if (customId.startsWith("PANEL_SELECT_")) {
                    const selectedValue = interaction.values?.[0] || "";
                    if (!selectedValue.startsWith("PANEL_OPT_")) return;

                    const optionId = parseInt(selectedValue.replace("PANEL_OPT_", ""), 10);
                    if (!optionId) return;

                    const option = await panelManager.getOptionById(bot, optionId);
                    if (!option) {
                        return interaction.reply({
                            content: "❌ La opción seleccionada ya no existe en el sistema.",
                            ephemeral: true
                        });
                    }

                    // Verificar si la opción cuenta con formulario modal configurado
                    const form = await panelManager.getFormByOptionId(bot, option.id);
                    const fields = form ? await panelManager.getFieldsByFormId(bot, form.id) : [];

                    // Si tiene formulario con campos, abrir modal al usuario
                    if (form && fields.length > 0) {
                        const modal = new ModalBuilder()
                            .setCustomId(`TICK_FORM_SUBMIT_${option.id}`)
                            .setTitle((form.title || `Formulario de ${option.name}`).slice(0, 45));

                        // Discord permite hasta 5 campos por modal
                        const maxFields = fields.slice(0, 5);
                        for (const f of maxFields) {
                            const textInput = new TextInputBuilder()
                                .setCustomId(`field_${f.id}`)
                                .setLabel(f.label.slice(0, 45))
                                .setStyle(f.field_type === "PARAGRAPH" ? TextInputStyle.Paragraph : TextInputStyle.Short)
                                .setRequired(Boolean(f.required));

                            if (f.placeholder) textInput.setPlaceholder(f.placeholder.slice(0, 100));
                            if (f.min_length) textInput.setMinLength(f.min_length);
                            if (f.max_length) textInput.setMaxLength(Math.min(f.max_length, 4000));

                            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                        }

                        return await interaction.showModal(modal);
                    }

                    // Si no tiene formulario, crear el ticket de inmediato
                    await interaction.deferReply({ ephemeral: true });
                    return await service.createDynamicTicket(bot, interaction, option.id, []);
                }

                // Menú legado de multi-categorías (/ticketpanel tradicional)
                if (customId === "TICKET_SELECT_CATEGORY") {
                    const selectedValue = interaction.values?.[0] || "";
                    const categoryId = selectedValue.replace("ticket_cat_", "");

                    // Intentar buscar si coincide con una opción dinámica
                    const option = await panelManager.getOptionByCustomId(bot, 1, categoryId);
                    if (option) {
                        await interaction.deferReply({ ephemeral: true });
                        return await service.createDynamicTicket(bot, interaction, option.id, []);
                    }

                    return interaction.reply({
                        content: "⚠️ Esta plantilla tradicional ha sido migrada a los nuevos Paneles Institucionales (`/panel`).",
                        ephemeral: true
                    });
                }

                return;
            }

            // ========================================================
            // 2. MODALES: RESPUESTAS DE FORMULARIOS DE TICKETS
            // ========================================================
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId || "";

                if (customId.startsWith("TICK_FORM_SUBMIT_")) {
                    const optionId = parseInt(customId.replace("TICK_FORM_SUBMIT_", ""), 10);
                    if (!optionId) return;

                    const form = await panelManager.getFormByOptionId(bot, optionId);
                    const fields = form ? await panelManager.getFieldsByFormId(bot, form.id) : [];

                    const responses = [];
                    for (const f of fields.slice(0, 5)) {
                        const val = interaction.fields.getTextInputValue(`field_${f.id}`);
                        responses.push({
                            field_id: f.id,
                            field_label: f.label,
                            response_value: val || ""
                        });
                    }

                    await interaction.deferReply({ ephemeral: true });
                    return await service.createDynamicTicket(bot, interaction, optionId, responses);
                }

                return;
            }

            // ========================================================
            // 3. BOTONES: GESTIÓN DE TICKETS Y CONFIRMACIONES
            // ========================================================
            if (interaction.isButton()) {
                const id = interaction.customId || "";

                // Confirmación de eliminación de panel administrativo
                if (id.startsWith("PANEL_CONFIRM_DEL_")) {
                    const panelId = parseInt(id.replace("PANEL_CONFIRM_DEL_", ""), 10);
                    const panel = await panelManager.getPanelById(bot, panelId);

                    await panelManager.deletePanel(bot, panelId);

                    return interaction.update({
                        content: `🗑️ El panel **${panel ? panel.name : panelId}** y sus opciones han sido eliminados de la base de datos.`,
                        components: []
                    });
                }

                if (id === "PANEL_CANCEL_DEL") {
                    return interaction.update({
                        content: "❌ Eliminación cancelada.",
                        components: []
                    });
                }

                // Botones operativos dentro del ticket
                if (id === "TICK_CLOSE") {
                    return await service.requestClose(bot, interaction);
                }

                if (id === "TICK_CONFIRM_CLOSE") {
                    return await service.executeClose(bot, interaction);
                }

                if (id === "TICK_CANCEL_CLOSE") {
                    return await interaction.update({
                        content: "✅ Cierre cancelado. El ticket continuará activo.",
                        components: []
                    });
                }

                if (id === "TICK_CLAIM") {
                    return await service.claimTicket(bot, interaction);
                }

                if (id === "TICK_TRANSCRIPT") {
                    await interaction.deferReply({ ephemeral: true });
                    const ticket = await bot.db.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channelId]);
                    const attachment = await service.generateTranscript(interaction.channel, ticket);
                    return await interaction.editReply({
                        content: "📋 **Copia de seguridad del ticket:**",
                        files: [attachment]
                    });
                }
            }
        } catch (err) {
            console.error("[tickets interactionCreate] Error:", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Ocurrió un error al procesar la interacción del sistema de tickets.",
                    ephemeral: true
                }).catch(() => null);
            } else {
                await interaction.followUp({
                    content: "Ocurrió un error al procesar la interacción.",
                    ephemeral: true
                }).catch(() => null);
            }
        }
    }
};
