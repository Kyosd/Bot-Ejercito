// modules/sanctions/commands/sancionar.js
"use strict";

const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");

const service = require("../service");
const logSanction = require("../logs");
const coreConfig = require("../../../core/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sancionar")
        .setDescription("Registrar una sanción militar a un soldado")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a sancionar")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("razon")
                .setDescription("Razón oficial de la sanción")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("pruebas")
                .setDescription("Enlaces o pruebas de la infracción")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        const mod = bot.modules.sanctions;
        const cfg = mod.config || {};

        const generalMember = interaction.member;

        // ============================
        // VALIDACIÓN DE PERMISOS
        // ============================
        const isGeneral = coreConfig.isGeneral(generalMember);

        if (!isGeneral) {
            return interaction.reply({
                content: "⛔ No tienes rango de mando para usar el sistema disciplinario.",
                ephemeral: true
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
            timestamp: Date.now(),
            status: "ACTIVE"
        });

        await service.updateWarnings(bot, soldierId, soldierTag, newWarning);

        // ============================
        // SINCRONIZAR ROLES DE ADVERTENCIA EN DISCORD
        // ============================
        if (interaction.guild) {
            await service.syncWarningRoles(interaction.guild, soldierId, newWarning);
        }

        // ============================
        // CORTE MARCIAL AUTOMÁTICA (3/3 ADVERTENCIAS)
        // ============================
        let isCourtMartial = false;
        if (newWarning >= 3) {
            isCourtMartial = true;
            // Bloqueo inmediato para entrar en servicio
            await bot.db.run(
                "INSERT INTO hours_blocked (user_id, reason, blocked_by, blocked_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason",
                [soldierId, "CORTE MARCIAL: 3/3 Advertencias Disciplinarias acumuladas", generalId, Date.now()]
            );

            // Si estaba en servicio activo, forzar salida
            const active = await bot.db.get("SELECT * FROM hours_active WHERE user_id = ?", [soldierId]);
            if (active) {
                const now = Date.now();
                const minutes = Math.max(1, Math.floor((now - active.start) / 60000));
                await bot.db.run('INSERT INTO hours_sessions (user_id, start, "end", duration) VALUES (?, ?, ?, ?)', [soldierId, active.start, now, minutes]);
                await bot.db.run("DELETE FROM hours_active WHERE user_id = ?", [soldierId]);
                try {
                    await bot.modules.hours?.livePanel?.update(bot);
                } catch (_) {}
            }
        }

        // ============================
        // ENVIAR FORMATO AL CANAL OFICIAL
        // ============================
        const sanctionsChannelId = cfg.sanctionsChannel || coreConfig.channels.sanctions;
        if (sanctionsChannelId) {
            const sanctionsChannel = await bot.client.channels.fetch(sanctionsChannelId).catch(() => null);

            if (sanctionsChannel && sanctionsChannel.isTextBased()) {
                const sanctionEmbed = new EmbedBuilder()
                    .setColor(isCourtMartial ? coreConfig.colors.danger : (cfg.colors?.warning || "#ffaa00"))
                    .setTitle(isCourtMartial ? "🚨 EXPEDIENTE DISCIPLINARIO — CORTE MARCIAL" : "📄 REPORTE DE SANCIÓN MILITAR")
                    .setDescription(
                        `👤 **Agente Sancionado:** ${soldierTag} (${soldierId})\n` +
                        `📝 **Motivo:** ${reason}\n` +
                        `⚠️ **Advertencia:** \`${newWarning}/3\` ${isCourtMartial ? "**[LÍMITE ALCANZADO]**" : ""}\n` +
                        `📎 **Pruebas:** ${evidence}\n` +
                        `🎖️ **Oficial Instructor:** ${generalTag}\n` +
                        `📅 **Fecha:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setFooter({
                        text: isCourtMartial
                            ? "SENTENCIA: Suspensión inmediata de funciones y servicio activo."
                            : "Reglamento Disciplinario Militar"
                    })
                    .setTimestamp();

                await sanctionsChannel.send({ embeds: [sanctionEmbed] });
            }
        }

        // ============================
        // LOG DEL SISTEMA
        // ============================
        await logSanction(
            bot,
            isCourtMartial ? "corte_marcial_activada" : "sanción_creada",
            generalId,
            soldierId,
            `Advertencia ${newWarning}/3 — ${reason}${isCourtMartial ? " [BLOQUEO AUTOMÁTICO APLICADO]" : ""}`
        );

        // ============================
        // PANEL DE GESTIÓN (EFÍMERO)
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
                .setCustomId(`confirm_reset_${soldierId}`)
                .setLabel("Resetear expediente")
                .setStyle(4),
            new ButtonBuilder()
                .setCustomId("san_close")
                .setLabel("Cerrar")
                .setStyle(2)
        );

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`san_menu_${soldierId}`)
                .setPlaceholder("Selecciona una opción del expediente")
                .addOptions([
                    { label: "Lista general de sancionados", value: "list" },
                    { label: "Historial completo del soldado", value: "history" },
                    { label: "Ver auditoría de logs", value: "logs" }
                ])
        );

        return interaction.reply({
            content: `✅ **Sanción registrada correctamente para ${soldierTag}.**${isCourtMartial ? "\n🚨 **ALERTA: Se ha ejecutado Corte Marcial por acumulación de 3/3 advertencias.**" : ""}`,
            components: [buttons, menu],
            ephemeral: true
        });
    }
};
