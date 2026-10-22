// modules/tickets/commands/crearticketseccion.js
"use strict";

const {
    SlashCommandBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const coreConfig = require("../../../core/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("crearticketseccion")
        .setDescription("Crea una sección de tickets decorada vinculada a una categoría de Discord (Solo Mando)")
        .addStringOption(opt =>
            opt.setName("nombre")
                .setDescription("Nombre de la sección militar (Ej: Reclutamiento, Asuntos Internos, Dudas)")
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName("canal_panel")
                .setDescription("Canal de texto donde se publicará el panel decorado con el botón")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("nombre_categoria")
                .setDescription("Nombre de la categoría en Discord (Si no existe, se creará automáticamente)")
                .setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName("categoria_existente")
                .setDescription("O selecciona una categoría que ya exista en tu servidor")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false)
        )
        .addRoleOption(opt =>
            opt.setName("rol_encargado")
                .setDescription("Rol militar encargado de atender esta sección (Opcional)")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ Solo el Alto Mando tiene autorización para crear secciones de tickets.",
                ephemeral: true
            });
        }

        const nameRaw = interaction.options.getString("nombre").trim();
        const panelChannel = interaction.options.getChannel("canal_panel");
        const existingCategory = interaction.options.getChannel("categoria_existente");
        const customCategoryName = interaction.options.getString("nombre_categoria")?.trim();
        const role = interaction.options.getRole("rol_encargado");

        // Si especificó nombre de categoría, usarlo; de lo contrario usar TICKETS - NOMBRE
        const targetCategoryName = customCategoryName || (existingCategory ? existingCategory.name : `🎫 TICKETS - ${nameRaw.toUpperCase()}`);
        const targetCategoryId = existingCategory ? existingCategory.id : null;
        const roleId = role ? role.id : null;

        // Guardamos el borrador en memoria temporal del bot
        bot._tempSectionDrafts = bot._tempSectionDrafts || new Map();
        const draftKey = `${interaction.user.id}_${Date.now()}`;

        bot._tempSectionDrafts.set(draftKey, {
            name: nameRaw,
            panelChannelId: panelChannel.id,
            discordCategoryId: targetCategoryId,
            categoryName: targetCategoryName,
            roleId: roleId
        });

        // Limpiar borradores antiguos tras 10 minutos
        setTimeout(() => {
            if (bot._tempSectionDrafts?.has(draftKey)) {
                bot._tempSectionDrafts.delete(draftKey);
            }
        }, 10 * 60 * 1000);

        const customId = `TICK_MDL_${draftKey}`;

        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle(`Decorar Panel: ${nameRaw.slice(0, 25)}`);

        // 1. Título del Embed
        const titleInput = new TextInputBuilder()
            .setCustomId("modal_title")
            .setLabel("Título del Panel Decorado")
            .setPlaceholder(`Ej: 🎖️ DEPARTAMENTO DE ${nameRaw.toUpperCase()}`)
            .setValue(`🎖️ ${nameRaw.toUpperCase()}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // 2. Descripción del Embed
        const descInput = new TextInputBuilder()
            .setCustomId("modal_desc")
            .setLabel("Descripción / Instrucciones del Ticket")
            .setPlaceholder("Escribe las indicaciones que verán los usuarios antes de abrir su ticket...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // 3. Imagen grande / Banner
        const imageInput = new TextInputBuilder()
            .setCustomId("modal_image")
            .setLabel("URL de Imagen / Banner (Opcional)")
            .setPlaceholder("https://i.imgur.com/tu_banner.png")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // 4. Logo / Miniatura
        const thumbInput = new TextInputBuilder()
            .setCustomId("modal_thumb")
            .setLabel("URL de Logo / Miniatura (Opcional)")
            .setPlaceholder("https://i.imgur.com/tu_escudo.png")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // 5. Texto del Botón
        const buttonInput = new TextInputBuilder()
            .setCustomId("modal_button")
            .setLabel("Texto del Botón")
            .setPlaceholder(`Ej: 📩 Abrir Ticket de ${nameRaw}`)
            .setValue(`📩 Abrir Ticket de ${nameRaw}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(thumbInput),
            new ActionRowBuilder().addComponents(buttonInput)
        );

        return interaction.showModal(modal);
    }
};
