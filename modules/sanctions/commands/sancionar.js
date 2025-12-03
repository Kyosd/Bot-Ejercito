// modules/sanctions/commands/sancionar.js
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

    async execute(bot, interaction) {
        const mod = bot.modules.sanctions;
        const cfg = mod.config;

        const generalMember = interaction.member;

        // ============================
        // VALIDACIÓN DE PERMISOS
        // ============================
        const isGeneral =
            cfg.generals.includes(generalMember.id) ||
            generalMember.roles.cache.some(r => cfg.generals.includes(r.id));

        if (!isGeneral) {
            return interaction.reply({
                content: "No tienes permiso para usar este comando.",
                ephemeral: true
            });
        }

        // ============================
        // DATOS DE LA SANCIÓN
        // ============================
        const target = interaction.options.getUser("soldado");
        const reason = interaction.options.getString("razon");
        const evidence =
            interaction.options.getString("pruebas") || "No proporcionadas";

        const soldierId = target.id;
        const soldierTag = `<@${soldierId}>`;
        const generalId = generalMember.id;
        const generalTag = `<@${generalId}>`;

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
            issued_by: generalId,
            issued_by_tag: generalTag,
            timestamp: Date.now()
        });

        await service.updateWarnings(bot, soldierId, soldierTag, newWarning);

        // ============================
        // ENVIAR FORMATO AL CANAL
        // ============================
        if (cfg.sanctionsChannel) {
            const sanctionsChannel =
                bot.client.channels.cache.get(cfg.sanctionsChannel);

            if (sanctionsChannel) {
                await sanctionsChannel.send(
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
        }

        // ============================
        // LOG DEL SISTEMA
        // ============================
        await logSanction(
            bot,
            "sanción_creada",
            generalId,
            soldierId,
            `Advertencia ${newWarning}/3 — ${reason}`
        );

        // ============================
        // PANEL DE GESTIÓN
        // ============================
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`san_view_${soldierId}`)
                .setLabel("Ver advertencias")
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId(`confirm_delete_last_${soldierId}`)
                .setLabel("Eliminar última")
                .setStyle(2),
            new ButtonBuilder()
                .setCustomId(`confirm_delete_one_${soldierId}`)
                .setLabel("Eliminar 1 ADV")
                .setStyle(2),
            new ButtonBuilder()
                .setCustomId(`confirm_reset_${soldierId}`)
                .setLabel("Resetear todas")
                .setStyle(4),
            new ButtonBuilder()
                .setCustomId("san_close")
                .setLabel("Cerrar")
                .setStyle(4)
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
            ephemeral: true
        });
    }
};
