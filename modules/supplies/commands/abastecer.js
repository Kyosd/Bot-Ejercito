"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");
const { rankCodeFor, resolveMemberRank } = require("../../../core/identity");

const TIPOS = ["Munición", "Combustible", "Médico", "Equipo", "Carga mixta"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("abastecer")
        .setDescription("Registra un abastecimiento de carga en patrulla")
        .addStringOption(opt =>
            opt.setName("tipo")
                .setDescription("Tipo de abastecimiento")
                .setRequired(true)
                .addChoices(...TIPOS.map(t => ({ name: t, value: t })))
        )
        .addIntegerOption(opt =>
            opt.setName("cantidad")
                .setDescription("Unidades / cargas abastecidas")
                .setRequired(true)
                .setMinValue(1)
        )
        .addAttachmentOption(opt =>
            opt.setName("evidencia")
                .setDescription("Prueba del abastecimiento")
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado que realizó el abastecimiento (por defecto tú)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("detalle")
                .setDescription("Descripción de la carga o patrulla")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        const actor = interaction.options.getUser("soldado") || interaction.user;
        const isSelf = actor.id === interaction.user.id;
        if (!isSelf && !coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "<:forbidden:1568246186702274733> Solo el Alto Mando puede registrar abastecimientos de otro soldado.",
                ephemeral: true
            });
        }

        // CANDADO DE AUSENCIA MILITAR
        const absenceService = bot.modules?.absences?.service;
        if (absenceService) {
            const abs = await absenceService.isAbsent(bot, actor.id);
            if (abs) {
                const msg = isSelf
                    ? `<:forbidden:1568246186702274733> **Acceso Denegado:** Cuentas con un reporte de ausencia militar activo (${abs.reason}). No puedes registrar abastecimientos hasta que te reincorpores.`
                    : `<:forbidden:1568246186702274733> **Operación Denegada:** El soldado <@${actor.id}> tiene un reporte de ausencia militar activo (${abs.reason}).`;
                return interaction.reply({ content: msg, ephemeral: true });
            }
        }

        const tipo = interaction.options.getString("tipo");
        const cantidad = interaction.options.getInteger("cantidad");
        const evidencia = interaction.options.getAttachment("evidencia");
        const detalle = interaction.options.getString("detalle") || "Abastecimiento de patrulla.";
        const now = Date.now();
        const db = bot.db;

        await db.run(
            `
            INSERT INTO supplies (soldier_id, soldier_tag, supply_type, amount, evidence, notes, logged_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                actor.id,
                actor.tag || actor.username,
                tipo,
                cantidad,
                evidencia.url,
                detalle,
                interaction.user.id,
                now
            ]
        );

        const weekStart = await getWeekStart(db);
        const weeklyRow = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ? AND created_at >= ?",
            [actor.id, weekStart]
        );
        const totalRow = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ?",
            [actor.id]
        );
        const weekly = Number(weeklyRow?.n || 0);
        const total = Number(totalRow?.n || 0);

        const profile = await db.get("SELECT display_name, plate, rank, rank_code FROM soldier_profiles WHERE user_id = ?", [actor.id]);
        const member = interaction.guild?.members.cache.get(actor.id)
            || await interaction.guild?.members.fetch(actor.id).catch(() => null);
        const resolved = resolveMemberRank(member);
        const code = resolved.code || profile?.rank_code || rankCodeFor(profile?.rank);

        const identity = profile?.plate
            ? `\`[${profile.plate}] ${profile.display_name || actor.username} ${code}\``
            : `<@${actor.id}>`;

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.success)
            .setTitle("<:inventory:1568241632489508945> ABASTECIMIENTO LOGÍSTICO REGISTRADO")
            .setThumbnail(actor.displayAvatarURL ? actor.displayAvatarURL({ size: 128 }) : null)
            .addFields(
                { name: "Soldado", value: `${identity}\n<@${actor.id}>`, inline: true },
                { name: "Tipo de Carga", value: `**${tipo}**`, inline: true },
                { name: "Cantidad", value: `**${cantidad}** unidades`, inline: true },
                { name: "Semanal", value: `**${weekly}** unidades`, inline: true },
                { name: "Total histórico", value: `**${total}** unidades`, inline: true },
                { name: "Detalles", value: detalle, inline: false }
            )
            .setImage(evidencia.contentType?.startsWith("image/") ? evidencia.url : null)
            .setFooter({ text: `Registrado por: ${interaction.user.tag || interaction.user.username} • Ejército Nacional` })
            .setTimestamp();

        const targetChannelId = coreConfig.channels.supplies;
        if (targetChannelId && interaction.guild && targetChannelId !== interaction.channelId) {
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId)
                || await interaction.guild.channels.fetch(targetChannelId).catch(() => null);

            if (targetChannel?.isTextBased()) {
                await targetChannel.send({
                    embeds: [embed],
                    files: evidencia.contentType?.startsWith("image/") ? [] : [evidencia]
                });

                return interaction.reply({
                    content: `<:inventory:1568241632489508945> **Abastecimiento registrado con éxito.** Publicado en <#${targetChannel.id}>.`,
                    ephemeral: true
                });
            }
        }

        return interaction.reply({
            embeds: [embed],
            files: evidencia.contentType?.startsWith("image/") ? [] : [evidencia]
        });
    }
};
