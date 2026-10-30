"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");

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
                content: "⛔ Solo el Alto Mando puede registrar abastecimientos de otro soldado.",
                ephemeral: true
            });
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

        const profile = await db.get("SELECT display_name, plate FROM soldier_profiles WHERE user_id = ?", [actor.id]);
        const identity = profile?.plate
            ? `\`[${profile.plate}] ${profile.display_name || actor.username}\``
            : `<@${actor.id}>`;

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.success)
            .setTitle("📦 Abastecimiento registrado")
            .setThumbnail(actor.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Soldado", value: `${identity}\n<@${actor.id}>`, inline: true },
                { name: "Tipo", value: `**${tipo}**`, inline: true },
                { name: "Carga", value: `**${cantidad}**`, inline: true },
                { name: "Semanal", value: `**${weekly}**`, inline: true },
                { name: "Total histórico", value: `**${total}**`, inline: true },
                { name: "Detalle", value: detalle, inline: false }
            )
            .setImage(evidencia.contentType?.startsWith("image/") ? evidencia.url : null)
            .setFooter({ text: "Logística de patrullas • Ejército Nacional" })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            files: evidencia.contentType?.startsWith("image/") ? [] : [evidencia]
        });
    }
};
