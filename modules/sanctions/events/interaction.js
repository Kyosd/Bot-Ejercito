// modules/sanctions/events/interaction.js
"use strict";

const {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder
} = require("discord.js");

const service = require("../service");
const embeds = require("../embeds");
const logSanction = require("../logs");
const coreConfig = require("../../../core/config");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        const mod = bot.modules.sanctions;
        if (!mod) return;

        // Solo manejamos botones y menús de selección de sanciones
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const id = interaction.customId ?? "";
        if (
            !id.startsWith("san_") &&
            !id.startsWith("confirm_") &&
            !id.startsWith("do_")
        ) {
            return;
        }

        // ==============================================
        // VALIDACIÓN DE SEGURIDAD ESTRICTA
        // ==============================================
        if (!coreConfig.isGeneral(interaction.member ?? interaction.user)) {
            return interaction.reply({
                content: "⛔ No tienes autorización de Mando para interactuar con expedientes disciplinarios.",
                ephemeral: true
            });
        }

        // CANCELAR
        if (id === "san_cancel") {
            return interaction.update({
                content: "Operación disciplinaria cancelada.",
                components: [],
                embeds: []
            });
        }

        // CERRAR PANEL
        if (id === "san_close") {
            return interaction.update({
                content: "Panel de gestión cerrado.",
                components: [],
                embeds: []
            });
        }

        // VER ADVERTENCIAS
        if (id.startsWith("san_view_")) {
            const soldierId = id.split("_")[2];
            const warnings = await service.getWarnings(bot, soldierId);

            return interaction.reply({
                embeds: [embeds.warningsEmbed(`<@${soldierId}>`, warnings)],
                ephemeral: true
            });
        }

        // CONFIRMAR ELIMINAR ÚLTIMA ADV
        if (id.startsWith("confirm_delete_last_")) {
            const soldierId = id.split("_")[3];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`do_delete_last_${soldierId}`)
                    .setLabel("Confirmar Eliminación")
                    .setStyle(4),
                new ButtonBuilder()
                    .setCustomId("san_cancel")
                    .setLabel("Cancelar")
                    .setStyle(2)
            );

            return interaction.reply({
                content: `¿Confirmas eliminar **la última sanción** del soldado <@${soldierId}>?`,
                components: [row],
                ephemeral: true
            });
        }

        if (id.startsWith("do_delete_last_")) {
            const soldierId = id.split("_")[3];

            await service.removeOneWarning(bot, soldierId);
            await logSanction(
                bot,
                "eliminar_ultima_sancion",
                interaction.user.id,
                soldierId,
                "Última sanción eliminada y sincronizada"
            );

            // Si tenía bloqueo por corte marcial y ahora tiene < 3 advertencias, desbloquear
            const remaining = await service.getWarnings(bot, soldierId);
            if (remaining < 3) {
                await bot.db.run("DELETE FROM hours_blocked WHERE user_id = ? AND reason LIKE '%CORTE MARCIAL%'", [soldierId]);
            }

            // Sincronizar roles de advertencia en Discord al retirar una advertencia
            if (interaction.guild) {
                await service.syncWarningRoles(interaction.guild, soldierId, remaining);
            }

            return interaction.update({
                content: `✅ Última sanción eliminada. Advertencias actuales de <@${soldierId}>: **${remaining}/3**`,
                components: []
            });
        }

        // CONFIRMAR RESETEO TOTAL DE EXPEDIENTE
        if (id.startsWith("confirm_reset_")) {
            const soldierId = id.split("_")[2];

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`do_reset_${soldierId}`)
                    .setLabel("Confirmar Reseteo Completo")
                    .setStyle(4),
                new ButtonBuilder()
                    .setCustomId("san_cancel")
                    .setLabel("Cancelar")
                    .setStyle(2)
            );

            return interaction.reply({
                content: `⚠️ ¿Confirmas **resetear todo el historial de sanciones** de <@${soldierId}>?`,
                components: [row],
                ephemeral: true
            });
        }

        if (id.startsWith("do_reset_")) {
            const soldierId = id.split("_")[2];

            await service.removeAllWarnings(bot, soldierId);
            await bot.db.run("DELETE FROM hours_blocked WHERE user_id = ? AND reason LIKE '%CORTE MARCIAL%'", [soldierId]);

            // Sincronizar roles de advertencia en Discord al resetear (retira los 3 roles de advertencia)
            if (interaction.guild) {
                await service.syncWarningRoles(interaction.guild, soldierId, 0);
            }

            await logSanction(
                bot,
                "resetear_advertencias",
                interaction.user.id,
                soldierId,
                "Se reseteó todo el expediente de sanciones"
            );

            return interaction.update({
                content: `♻️ El expediente disciplinario de <@${soldierId}> ha sido limpiado por completo.`,
                components: []
            });
        }

        // SELECT MENÚ
        if (interaction.isStringSelectMenu() && id.startsWith("san_menu_")) {
            const soldierId = id.split("_")[2];
            const soldierTag = `<@${soldierId}>`;
            const value = interaction.values[0];

            if (value === "list") {
                const list = await service.getSanctionsList(bot);
                return interaction.reply({
                    embeds: [embeds.listEmbed(list)],
                    ephemeral: true
                });
            }

            if (value === "history") {
                const history = await service.getHistory(bot, soldierId);
                return interaction.reply({
                    embeds: [embeds.historyEmbed(soldierTag, history)],
                    ephemeral: true
                });
            }

            if (value === "logs") {
                const rows = await bot.db.all(
                    "SELECT * FROM sanction_logs ORDER BY log_id DESC LIMIT 10"
                );

                const embed = new EmbedBuilder()
                    .setColor(coreConfig.colors.log)
                    .setTitle("📘 AUDITORÍA DE SANCIONES MILITARES");

                if (!rows.length) {
                    embed.setDescription("No hay registros de auditoría disciplinaria.");
                } else {
                    embed.setDescription(
                        rows
                            .map(
                                l =>
                                    `• **${l.action}**\n` +
                                    `👮 Mando: <@${l.general_id}>\n` +
                                    `🎯 Objetivo: ${l.target_soldier_id ? `<@${l.target_soldier_id}>` : "N/A"}\n` +
                                    `📝 ${l.detail}\n` +
                                    `📅 <t:${Math.floor(l.timestamp / 1000)}:R>`
                            )
                            .join("\n\n")
                    );
                }

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
        }
    }
};
