// modules/tactical/events/interaction.js
"use strict";

const { EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");

module.exports = {
    name: "interactionCreate",

    async execute(bot, interaction) {
        if (!interaction.isButton()) return;

        const id = interaction.customId || "";
        if (!id.startsWith("CONV_")) return;

        const parts = id.split("_");
        const action = parts[1]; // ATTEND, LATE, ABSENT, LIST
        const convId = parts[2];
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;
        const db = bot.db;

        // 1. Ver lista de asistentes
        if (action === "LIST") {
            const attendees = await db.all(
                "SELECT user_id, status FROM convocation_attendees WHERE convocation_id = ?",
                [convId]
            );

            if (!attendees.length) {
                return interaction.reply({
                    content: "Aún no hay ningún soldado registrado para este operativo.",
                    ephemeral: true
                });
            }

            const present = attendees.filter(a => a.status === "ATTENDING").map(a => `<@${a.user_id}>`);
            const late = attendees.filter(a => a.status === "LATE").map(a => `<@${a.user_id}>`);
            const absent = attendees.filter(a => a.status === "ABSENT").map(a => `<@${a.user_id}>`);

            const embed = new EmbedBuilder()
                .setColor(coreConfig.colors.embed)
                .setTitle("📋 Registro de Contingente Convocado")
                .addFields([
                    { name: `✅ Confirmados (${present.length})`, value: present.join("\n") || "Ninguno", inline: true },
                    { name: `⏳ Con Retraso (${late.length})`, value: late.join("\n") || "Ninguno", inline: true },
                    { name: `❌ Ausentes (${absent.length})`, value: absent.join("\n") || "Ninguno", inline: true }
                ])
                .setFooter({ text: "Control de Personal Táctico" });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 2. Registrar o actualizar estado
        let newStatus = "ATTENDING";
        let statusLabel = "✅ Confirmada tu asistencia al despliegue.";
        if (action === "LATE") {
            newStatus = "LATE";
            statusLabel = "⏳ Registrado que llegarás con retraso justificado.";
        } else if (action === "ABSENT") {
            newStatus = "ABSENT";
            statusLabel = "❌ Registrada tu ausencia justificada.";
        }

        await db.run(
            `
            INSERT INTO convocation_attendees (convocation_id, user_id, user_tag, status, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(convocation_id, user_id) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at
        `,
            [convId, userId, userTag, newStatus, Date.now()]
        );

        // 3. Actualizar contadores en el embed original
        try {
            const counts = await db.all(
                "SELECT status, COUNT(*) as count FROM convocation_attendees WHERE convocation_id = ? GROUP BY status",
                [convId]
            );

            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            for (const c of counts) {
                if (c.status === "ATTENDING") presentCount = Number(c.count);
                if (c.status === "LATE") lateCount = Number(c.count);
                if (c.status === "ABSENT") absentCount = Number(c.count);
            }

            const originalMsg = interaction.message;
            if (originalMsg?.embeds?.[0]) {
                const oldEmbed = originalMsg.embeds[0];
                const oldDesc = oldEmbed.description || "";

                // Reemplazamos la sección de estadísticas
                const splitIndex = oldDesc.indexOf("──────────────────────────");
                const baseText = splitIndex !== -1 ? oldDesc.slice(0, splitIndex) : oldDesc;

                const newDesc =
                    baseText +
                    `──────────────────────────\n` +
                    `📊 **Estado del Contingente Confirmado:**\n` +
                    `• ✅ **Presentes:** \`${presentCount}\` efectivos\n` +
                    `• ⏳ **Con Retraso:** \`${lateCount}\` efectivos\n` +
                    `• ❌ **Ausentes:** \`${absentCount}\` efectivos`;

                const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
                await originalMsg.edit({ embeds: [updatedEmbed] });
            }
        } catch (err) {
            console.error("[tactical] Error actualizando embed de convocatoria:", err);
        }

        return interaction.reply({
            content: `${statusLabel} Tu respuesta ha sido registrada en el sistema.`,
            ephemeral: true
        });
    }
};
