// modules/arrests/commands/arresto.js
"use strict";

const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");
const { rankCodeFor, resolveMemberRank } = require("../../../core/identity");
const config = require("../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("arresto")
        .setDescription("Registra el arresto efectuado a un civil con evidencia e integrantes del operativo")
        .addStringOption(opt =>
            opt.setName("civil")
                .setDescription("Nombre del civil o sujeto arrestado")
                .setRequired(true)
                .setMaxLength(64)
        )
        .addStringOption(opt =>
            opt.setName("articulo")
                .setDescription("Artículo, numeral o motivo de la infracción (texto plano)")
                .setRequired(true)
                .setMaxLength(150)
        )
        .addAttachmentOption(opt =>
            opt.setName("evidencia")
                .setDescription("Foto o captura de evidencia del procedimiento")
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName("companero")
                .setDescription("Compañero que participó en el operativo (opcional)")
                .setRequired(false)
        )
        .addUserOption(opt =>
            opt.setName("companero2")
                .setDescription("Segundo compañero que participó en el operativo (opcional)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("motivo")
                .setDescription("Observaciones o detalles del procedimiento (opcional)")
                .setRequired(false)
                .setMaxLength(1000)
        ),

    async execute(bot, interaction) {
        // Defer reply efímero para evitar timeouts mientras procesamos imagen y base de datos
        await interaction.deferReply({ flags: 64 });

        const civil = interaction.options.getString("civil").trim();
        const articulo = interaction.options.getString("articulo").trim();
        const evidencia = interaction.options.getAttachment("evidencia");
        const comp1 = interaction.options.getUser("companero");
        const comp2 = interaction.options.getUser("companero2");
        const motivo = interaction.options.getString("motivo") || "Procedimiento de control y captura civil.";

        // 1. Agrupar soldados participantes únicos (quien ejecuta el comando + compañeros)
        const rawSoldiers = [interaction.user, comp1, comp2].filter(Boolean);
        const soldiersMap = new Map();
        for (const s of rawSoldiers) {
            if (!soldiersMap.has(s.id)) {
                soldiersMap.set(s.id, s);
            }
        }
        const participatingSoldiers = Array.from(soldiersMap.values());

        // CANDADO DE AUSENCIA MILITAR
        const absenceService = bot.modules?.absences?.service;
        if (absenceService) {
            for (const soldier of participatingSoldiers) {
                const abs = await absenceService.isAbsent(bot, soldier.id);
                if (abs) {
                    const isSelf = soldier.id === interaction.user.id;
                    const msg = isSelf
                        ? `⛔ **Acceso Denegado:** Cuentas con un reporte de ausencia militar activo (${abs.reason}). No puedes registrar arrestos hasta que te reincorpores.`
                        : `⛔ **Operación Denegada:** El soldado <@${soldier.id}> tiene un reporte de ausencia militar activo (${abs.reason}) y no puede ser incluido en el operativo.`;
                    return interaction.editReply({ content: msg });
                }
            }
        }

        const now = Date.now();
        const db = bot.db;
        const weekStart = await getWeekStart(db);

        // 2. Registrar en la base de datos para cada soldado participante
        const statsPerSoldier = [];

        for (const soldier of participatingSoldiers) {
            await db.run(
                `
                INSERT INTO arrests (soldier_id, soldier_tag, civilian_name, infraction_code, infraction_label, evidence, notes, issued_by, issued_by_tag, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    soldier.id,
                    soldier.tag || soldier.username,
                    civil,
                    0,
                    articulo,
                    evidencia.url,
                    motivo,
                    interaction.user.id,
                    interaction.user.tag || interaction.user.username,
                    now
                ]
            );

            // Contar arrestos de la semana y total histórico
            const weeklyRow = await db.get(
                "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ? AND created_at >= ?",
                [soldier.id, weekStart]
            );
            const totalRow = await db.get(
                "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ?",
                [soldier.id]
            );
            const weeklyCount = Number(weeklyRow?.n || 0);
            const totalCount = Number(totalRow?.n || 0);

            // Perfil militar del soldado
            const profile = await db.get(
                "SELECT display_name, plate, rank, rank_code FROM soldier_profiles WHERE user_id = ?",
                [soldier.id]
            );

            const member = interaction.guild?.members.cache.get(soldier.id)
                || await interaction.guild?.members.fetch(soldier.id).catch(() => null);
            const resolved = resolveMemberRank(member);
            const code = resolved.code || profile?.rank_code || rankCodeFor(profile?.rank);

            // Si tiene placa militar asignada mostrar [PLACA] Nombre Rango, de lo contrario solo su mención única
            const soldierDisplay = profile?.plate
                ? `\`[${profile.plate}] ${profile.display_name || soldier.username} ${code}\` (<@${soldier.id}>)`
                : `<@${soldier.id}>`;

            statsPerSoldier.push({
                user: soldier,
                display: soldierDisplay,
                weekly: weeklyCount,
                total: totalCount
            });
        }

        // 3. Procesar archivo de evidencia para que Discord lo renderice en el embed
        let filesToSend = [];
        const fileExt = evidencia.name?.split(".").pop() || "png";
        const fileName = `evidencia_${Date.now()}.${fileExt}`;

        try {
            const resp = await fetch(evidencia.url);
            if (resp.ok) {
                const arrayBuf = await resp.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                const fileAttachment = new AttachmentBuilder(buffer, { name: fileName });
                filesToSend.push(fileAttachment);
            }
        } catch (_) {}

        // 4. Construir Embed Militar
        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle("<a:siren:1565823848610406523> PROCEDIMIENTO DE ARRESTO CIVIL REGISTRADO")
            .setDescription("Se ha asentado oficialmente en el sistema táctico la captura de un civil infractor.")
            .setThumbnail(interaction.user.displayAvatarURL ? interaction.user.displayAvatarURL({ size: 128 }) : null)
            .addFields(
                { name: "<:arrested:1565457686806397093> Sujeto arrestado", value: `**${civil}**`, inline: true },
                { name: "<a:law:1563959904178536489> Artículo / Infracción", value: `**${articulo}**`, inline: true }
            );

        // Desglose limpio de participantes sin duplicar nombres
        let soldiersSummary = "";
        for (const stat of statsPerSoldier) {
            soldiersSummary += `• ${stat.display}\n  └ <:top:1565456496458858506> **Semana:** \`${stat.weekly}\` | <a:escribiendo:1563959662003622014> **Total:** \`${stat.total}\` arrestos\n`;
        }

        embed.addFields(
            {
                name: `<:members:1565472624921018491> Efectivos participantes (${participatingSoldiers.length})`,
                value: soldiersSummary.slice(0, 1024),
                inline: false
            },
            { name: "<a:book:1563965558884671638> Observaciones", value: motivo, inline: false }
        );

        // Si logramos adjuntar el archivo lo mostramos en el embed con attachment://
        if (filesToSend.length > 0) {
            embed.setImage(`attachment://${fileName}`);
        } else if (evidencia.url) {
            embed.setImage(evidencia.url);
        }

        embed
            .setFooter({ text: `Registrado por: ${interaction.user.tag || interaction.user.username} • Ejército Nacional` })
            .setTimestamp(now);

        // 5. Determinar canal de destino (SOLO se envía 1 vez)
        const targetChannelId = config.channel;
        const targetChannel = (targetChannelId && interaction.guild)
            ? (interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null))
            : interaction.channel;

        if (targetChannel?.isTextBased()) {
            await targetChannel.send({ embeds: [embed], files: filesToSend });
        }

        // 6. Notificación privada al usuario que ejecutó el comando
        const confirmMsg = (targetChannel && targetChannel.id !== interaction.channelId)
            ? `<a:check:1563959567191244892> **Arresto registrado con éxito.** Publicado en <#${targetChannel.id}>.`
            : "<a:check:1563959567191244892> **Arresto registrado y publicado con éxito.**";

        return interaction.editReply({ content: confirmMsg });
    }
};
