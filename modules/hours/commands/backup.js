// modules/hours/commands/backup.js
"use strict";

const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("backup")
        .setDescription("Genera y descarga una copia de seguridad completa de la base de datos (Solo Mando)"),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ No tienes autorización del Alto Mando para exportar datos del sistema.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const db = bot.db;

        try {
            const backupData = {
                version: "2.1.0",
                exported_at: new Date().toISOString(),
                exported_by: interaction.user.tag || interaction.user.username,
                engine: db.type,
                data: {
                    hours_active: await db.all("SELECT * FROM hours_active"),
                    hours_sessions: await db.all("SELECT * FROM hours_sessions"),
                    hours_blocked: await db.all("SELECT * FROM hours_blocked"),
                    sanctions: await db.all("SELECT * FROM sanctions"),
                    soldier_warnings: await db.all("SELECT * FROM soldier_warnings"),
                    soldier_profiles: await db.all("SELECT * FROM soldier_profiles"),
                    arrests: await db.all("SELECT * FROM arrests").catch(() => []),
                    supplies: await db.all("SELECT * FROM supplies").catch(() => []),
                    absences: await db.all("SELECT * FROM absences").catch(() => []),
                    convocations: await db.all("SELECT * FROM convocations").catch(() => []),
                    convocation_attendees: await db.all("SELECT * FROM convocation_attendees").catch(() => [])
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
            const fileName = `backup_ejercito_${dateStr}.json`;

            const attachment = new AttachmentBuilder(Buffer.from(jsonString, "utf-8"), {
                name: fileName
            });

            const embed = new EmbedBuilder()
                .setColor(coreConfig.colors.militaryGold || "#d4af37")
                .setTitle("💾 COPIA DE SEGURIDAD GENERADA")
                .setDescription(
                    `Se ha generado un volcado íntegro de la base de datos militar (${db.type.toUpperCase()}).\n\n` +
                    `• **Sesiones de servicio:** \`${backupData.data.hours_sessions.length}\`\n` +
                    `• **Sanciones registradas:** \`${backupData.data.sanctions.length}\`\n` +
                    `• **Expedientes de soldados:** \`${backupData.data.soldier_profiles.length}\`\n` +
                    `• **Arrestos registrados:** \`${backupData.data.arrests.length}\`\n` +
                    `• **Abastecimientos:** \`${backupData.data.supplies.length}\`\n` +
                    `• **Ausencias:** \`${backupData.data.absences.length}\``
                )
                .setFooter({ text: "Guarda este archivo en un lugar seguro." })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });
        } catch (err) {
            console.error("[backup] Error generando copia de seguridad:", err);
            await interaction.editReply({
                content: "Ocurrió un error al generar la copia de seguridad."
            });
        }
    }
};
