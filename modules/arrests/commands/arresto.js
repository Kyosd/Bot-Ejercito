"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");
const { rankCodeFor } = require("../../../core/identity");
const config = require("../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("arresto")
        .setDescription("Registra el arresto efectuado a un civil con numeral de infracción y evidencia")
        .addStringOption(opt =>
            opt.setName("civil")
                .setDescription("Nombre del civil o sujeto arrestado")
                .setRequired(true)
                .setMaxLength(64)
        )
        .addIntegerOption(opt => {
            opt.setName("infraccion")
                .setDescription("Numeral o artículo de la infracción cometida por el civil")
                .setRequired(true);
            for (const item of config.infracciones) {
                opt.addChoices({ name: `${item.n}. ${item.name}`, value: item.n });
            }
            return opt;
        })
        .addAttachmentOption(opt =>
            opt.setName("evidencia")
                .setDescription("Captura / prueba visual del procedimiento de arresto")
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado que ejecutó el arresto (por defecto tú mismo)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("motivo")
                .setDescription("Detalle del procedimiento u observaciones del arresto")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        // El soldado que efectuó el arresto: por defecto quien ejecuta el comando, o si se especifica otro, solo el mando puede registrarlo a nombre de otro
        const targetSoldier = interaction.options.getUser("soldado") || interaction.user;
        const isSelf = targetSoldier.id === interaction.user.id;

        if (!isSelf && !coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ Solo el Alto Mando puede registrar arrestos a nombre de otro soldado.",
                flags: 64
            });
        }

        const civil = interaction.options.getString("civil").trim();
        const numeral = interaction.options.getInteger("infraccion");
        const evidencia = interaction.options.getAttachment("evidencia");
        const motivo = interaction.options.getString("motivo") || "Procedimiento de control y captura civil.";
        const label = config.labelFor(numeral);
        const now = Date.now();
        const db = bot.db;

        // Registrar en base de datos
        await db.run(
            `
            INSERT INTO arrests (soldier_id, soldier_tag, civilian_name, infraction_code, infraction_label, evidence, notes, issued_by, issued_by_tag, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                targetSoldier.id,
                targetSoldier.tag || targetSoldier.username,
                civil,
                numeral,
                label,
                evidencia.url,
                motivo,
                interaction.user.id,
                interaction.user.tag || interaction.user.username,
                now
            ]
        );

        // Contar arrestos realizados por este soldado en la semana y totales
        const weekStart = await getWeekStart(db);
        const weeklyRow = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ? AND created_at >= ?",
            [targetSoldier.id, weekStart]
        );
        const totalRow = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ?",
            [targetSoldier.id]
        );
        const weeklyCount = Number(weeklyRow?.n || 0);
        const totalCount = Number(totalRow?.n || 0);

        // Obtener datos del perfil militar del soldado (placa, apodo, rango)
        const profile = await db.get("SELECT display_name, plate, rank, rank_code FROM soldier_profiles WHERE user_id = ?", [targetSoldier.id]);
        const code = profile?.rank_code || rankCodeFor(profile?.rank);
        const soldierDisplay = profile?.plate
            ? `\`[${profile.plate}] ${profile.display_name || targetSoldier.username} ${code}\`\n<@${targetSoldier.id}>`
            : `<@${targetSoldier.id}>`;

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle("🚨 PROCEDIMIENTO DE ARRESTO CIVIL REGISTRADO")
            .setDescription(`Se ha asentado oficialmente en el registro táctico la captura de un civil infractor.`)
            .setThumbnail(targetSoldier.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "👤 Soldado actuante", value: soldierDisplay, inline: true },
                { name: "🚷 Sujeto arrestado", value: `**${civil}**`, inline: true },
                { name: "⚖️ Infracción / Numeral", value: `**${label}**`, inline: false },
                { name: "📊 Arrestos semanales del soldado", value: `\`${weeklyCount} arresto${weeklyCount === 1 ? "" : "s"}\``, inline: true },
                { name: "📈 Total histórico de arrestos", value: `\`${totalCount} arresto${totalCount === 1 ? "" : "s"}\``, inline: true },
                { name: "📝 Observaciones", value: motivo, inline: false }
            )
            .setImage(evidencia.contentType?.startsWith("image/") ? evidencia.url : undefined)
            .setFooter({ text: `Registrado por: ${interaction.user.tag} • Ejército Nacional` })
            .setTimestamp(now);

        const payload = {
            embeds: [embed],
            files: evidencia.contentType?.startsWith("image/") ? [] : [evidencia]
        };

        await interaction.reply(payload);

        // Canal de auditoría de arrestos si está configurado
        if (config.channel && config.channel !== interaction.channelId) {
            const logChannel = await interaction.guild.channels.fetch(config.channel).catch(() => null);
            if (logChannel?.isTextBased()) {
                await logChannel.send(payload).catch(() => null);
            }
        }
    }
};
