const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const service = require("../service");
const logSanction = require("../logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sancionar")
        .setDescription("Registrar una sanción a un soldado")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a sancionar")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("razon")
                .setDescription("Razón de la sanción")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("pruebas")
                .setDescription("Pruebas de la sanción")
                .setRequired(false)
        ),

    // AHORA la firma es correcta para tu loader: execute(bot, interaction)
    async execute(bot, interaction) {

        const general = interaction.user;

        // ============================
        // VALIDACIÓN DE PERMISOS
        // ============================
        const generals = process.env.ROLE_GENERALES
            ? process.env.ROLE_GENERALES.split(",").map(x => x.trim())
            : [];

        const member = interaction.member;

        const esGeneral =
            generals.includes(member.id) || // usuario listado
            member.roles.cache.some(r => generals.includes(r.id)); // rol listado

        if (!esGeneral) {
            return interaction.reply({
                content: "No tienes permiso para usar este comando.",
                flags: 64 // replacement for ephemeral
            });
        }

        // ============================
        // DATOS DE LA SANCIÓN
        // ============================
        const target = interaction.options.getUser("soldado");
        const reason = interaction.options.getString("razon");
        const evidence = interaction.options.getString("pruebas") || "No proporcionadas";

        const soldierId = target.id;
        const soldierTag = `<@${soldierId}>`;
        const generalTag = `<@${general.id}>`;

        // ============================
        // OBTENER Y ACTUALIZAR WARNINGS
        // ============================
        const currentWarnings = await service.getWarnings(bot, soldierId);
        const newWarning = currentWarnings + 1;

        await service.addSanction(bot, {
            soldier_id: soldierId,
            soldier_tag: soldierTag,
            reason,
            evidence,
            warning_number: newWarning,
            issued_by: general.id,
            issued_by_tag: generalTag,
            timestamp: Date.now()
        });

        await service.updateWarnings(bot, soldierId, soldierTag, newWarning);

        // ============================
        // ENVIAR AL CANAL DE SANCIONES
        // ============================
        const sanctionsChannel = bot.client.channels.cache.get(process.env.SANCTIONS_CHANNEL);

        if (sanctionsChannel) {
            sanctionsChannel.send(
`📄 **FORMATO DE SANCIONES**

👤 **Nombre del agente:** ${soldierTag}
📝 **Razón:** ${reason}
⚠️ **Número de advertencia:** ${newWarning}/3
📎 **Pruebas:** ${evidence}
🎖️ **Emitido por:** ${generalTag}
📅 **Fecha:** <t:${Math.floor(Date.now() / 1000)}:F>
`
            );
        }

        // ============================
        // LOG DEL SISTEMA (corregido)
        // ============================
        await logSanction(
            bot,                                  // << ESTE ES EL FIX
            "sanción_creada",
            general.id,
            soldierId,
            `Advertencia ${newWarning}/3 — ${reason}`
        );

        // ============================
        // PANEL DE GESTIÓN (con botones)
        // ============================
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`san_view_${soldierId}`).setLabel("Ver advertencias").setStyle(1),
            new ButtonBuilder().setCustomId(`confirm_delete_last_${soldierId}`).setLabel("Eliminar última").setStyle(2),
            new ButtonBuilder().setCustomId(`confirm_delete_one_${soldierId}`).setLabel("Eliminar 1 ADV").setStyle(2),
            new ButtonBuilder().setCustomId(`confirm_reset_${soldierId}`).setLabel("Resetear todas").setStyle(4),
            new ButtonBuilder().setCustomId("san_close").setLabel("Cerrar").setStyle(4)
        );

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`san_menu_${soldierId}`)
                .setPlaceholder("Selecciona una opción")
                .addOptions([
                    { label: "Lista de sancionados", value: "list" },
                    { label: "Historial del sancionado", value: "history" },
                    { label: "Historial general del sistema", value: "history_global" },
                    { label: "Ver logs", value: "logs" }
                ])
        );

        return interaction.reply({
            content: `Panel de gestión para ${soldierTag}`,
            components: [buttons, menu],
            flags: 64 // reemplazo moderno de ephemeral
        });
    }
};
