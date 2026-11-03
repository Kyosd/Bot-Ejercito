"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require("discord.js");

const config = require("./config");
const coreConfig = require("../../core/config");
const { rankCodeFor, buildNickname, resolveMemberRank, resolveMemberDivision } = require("../../core/identity");

async function fetchTextChannel(bot, channelId) {
    if (!channelId) return null;
    return bot.client.channels.fetch(channelId).catch(() => null);
}

async function generateUniquePlate(db) {
    for (let i = 0; i < 40; i++) {
        const plate = String(1000 + Math.floor(Math.random() * 9000));
        const exists = await db.get("SELECT user_id FROM soldier_profiles WHERE plate = ?", [plate]);
        if (!exists) return plate;
    }
    return String(Date.now()).slice(-4);
}

async function applyNicknameAndRoles(guild, member, plate, displayName, rankCode) {
    const nick = buildNickname(plate, displayName, rankCode);
    await member.setNickname(nick, "Verificación militar").catch(err => {
        console.warn("[verify] No se pudo cambiar el apodo (permisos/jerarquía):", err.message);
    });

    for (const roleId of config.verifiedRoleIds) {
        if (guild.roles.cache.has(roleId) || await guild.roles.fetch(roleId).catch(() => null)) {
            await member.roles.add(roleId, "Verificación militar").catch(err => {
                console.warn("[verify] No se pudo añadir rol", roleId, err.message);
            });
        }
    }

    for (const roleId of config.unverifiedRoleIds) {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, "Verificación militar").catch(() => null);
        }
    }

    return nick;
}

module.exports = {
    async deployPanel(bot, channel) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle("🛡️ Verificación de personal")
            .setDescription(
                "Si ya perteneces a la unidad, verifica tu identidad para recibir **placa**, **apodo militar** y **roles de acceso**.\n\n" +
                "**Formato de identificación**\n" +
                "`[1508] Sebastian Duke ☆C☆`\n" +
                "• Placa aleatoria de 4 dígitos\n" +
                "• El nombre que indiques en el formulario\n" +
                "• Distintivo de rango (`☆C☆`, `☆R☆`, …)\n\n" +
                "El Alto Mando revisará tu solicitud antes de activar el acceso."
            )
            .setFooter({ text: "Sistema de verificación • Ejército Nacional" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("VERIFY_OPEN")
                .setLabel("Verificarme")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
        );

        const meta = await bot.db.get("SELECT value FROM hours_meta WHERE key = 'verify_panel_messageId'").catch(() => null);
        let existing = null;
        if (meta?.value) existing = await channel.messages.fetch(meta.value).catch(() => null);

        if (existing) {
            await existing.edit({ embeds: [embed], components: [row] });
            return existing;
        }

        const sent = await channel.send({ embeds: [embed], components: [row] });
        await bot.db.run(
            "INSERT INTO hours_meta (key, value) VALUES ('verify_panel_messageId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [sent.id]
        );
        return sent;
    },

    async openModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId("VERIFY_MODAL")
            .setTitle("Solicitud de verificación");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("display_name")
                    .setLabel("Nombre y apellido (rol / Discord)")
                    .setPlaceholder("Ejemplo: Sebastian Duke")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(24)
            )
        );

        return interaction.showModal(modal);
    },

    async submitRequest(bot, interaction) {
        const displayName = interaction.fields.getTextInputValue("display_name").replace(/\s+/g, " ").trim();
        const db = bot.db;
        const userId = interaction.user.id;

        const profile = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [userId]);
        if (profile?.verified_at) {
            return interaction.reply({
                content: "Ya estás verificado. Si necesitas corregir tu placa o nombre, habla con el Alto Mando.",
                ephemeral: true
            });
        }

        const pending = await db.get(
            "SELECT id FROM verification_requests WHERE user_id = ? AND status = 'PENDING'",
            [userId]
        );
        if (pending) {
            return interaction.reply({
                content: "Ya tienes una solicitud en revisión. Espera la decisión del Alto Mando.",
                ephemeral: true
            });
        }

        const channel = await fetchTextChannel(bot, config.requestsChannel);
        if (!channel?.isTextBased()) {
            return interaction.reply({
                content: "No está configurado el canal de solicitudes de verificación (`CHANNEL_VERIFICATION`).",
                ephemeral: true
            });
        }

        const memberForRank = interaction.member;
        const resolved = resolveMemberRank(memberForRank);
        const previewCode = resolved.code;

        const embed = new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle("📥 Solicitud de verificación")
            .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
            .setDescription(
                `**Usuario:** <@${userId}> (\`${userId}\`)\n` +
                `**Nombre solicitado:** \`${displayName}\`\n` +
                `**Rango detectado (roles):** \`${resolved.rank}\` ${previewCode}\n` +
                `**Vista previa:** \`[????] ${displayName} ${previewCode}\``
            )
            .setFooter({ text: "Solo el Alto Mando puede aprobar o rechazar" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("VERIFY_APPROVE").setLabel("Aprobar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("VERIFY_DENY").setLabel("Rechazar").setStyle(ButtonStyle.Danger)
        );

        const sent = await channel.send({ embeds: [embed], components: [row] });

        await db.run(
            `
            INSERT INTO verification_requests (user_id, display_name, channel_id, message_id, status, created_at)
            VALUES (?, ?, ?, ?, 'PENDING', ?)
            `,
            [userId, displayName, sent.channel.id, sent.id, Date.now()]
        );

        return interaction.reply({
            content: "Tu solicitud fue enviada al Alto Mando. Te notificarán al verificarla.",
            ephemeral: true
        });
    },

    async handleDecision(bot, interaction, approved) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ Solo el Alto Mando puede resolver verificaciones.",
                ephemeral: true
            });
        }

        const db = bot.db;
        const request = await db.get(
            "SELECT * FROM verification_requests WHERE message_id = ? AND status = 'PENDING'",
            [interaction.message.id]
        );

        if (!request) {
            return interaction.reply({
                content: "Esta solicitud ya no está pendiente.",
                ephemeral: true
            });
        }

        if (!approved) {
            await db.run(
                "UPDATE verification_requests SET status = 'DENIED', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
                [interaction.user.id, Date.now(), request.id]
            );
            await interaction.update({
                content: `❌ Rechazada por <@${interaction.user.id}>.`,
                embeds: interaction.message.embeds,
                components: []
            });
            const deniedUser = await bot.client.users.fetch(request.user_id).catch(() => null);
            await deniedUser?.send("❌ Tu solicitud de verificación fue rechazada. Contacta al Alto Mando.").catch(() => null);
            return;
        }

        const guild = interaction.guild;
        const member = await guild.members.fetch(request.user_id).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: "No se encontró al miembro en el servidor.",
                ephemeral: true
            });
        }

        const me = guild.members.me;
        if (!me?.permissions.has(PermissionFlagsBits.ManageNicknames) || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: "El bot necesita permisos de **Gestionar apodos** y **Gestionar roles**, y su rol debe estar por encima de los roles a asignar.",
                ephemeral: true
            });
        }

        const resolved = resolveMemberRank(member);
        const resolvedDivision = resolveMemberDivision(member, config.defaultDivision);

        let profile = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [request.user_id]);
        const rank = resolved.rank || profile?.rank || config.defaultRank;
        const division = resolvedDivision || profile?.division || config.defaultDivision;
        const code = resolved.code || profile?.rank_code || rankCodeFor(rank);
        const plate = profile?.plate || await generateUniquePlate(db);
        const now = Date.now();

        await db.run(
            `
            INSERT INTO soldier_profiles (user_id, rank, division, joined_at, medals, display_name, plate, rank_code, verified_at, verified_by)
            VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                display_name = excluded.display_name,
                plate = COALESCE(soldier_profiles.plate, excluded.plate),
                rank = excluded.rank,
                division = excluded.division,
                rank_code = excluded.rank_code,
                verified_at = excluded.verified_at,
                verified_by = excluded.verified_by
            `,
            [request.user_id, rank, division, now, request.display_name, plate, code, now, interaction.user.id]
        );

        const saved = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [request.user_id]);
        const nick = await applyNicknameAndRoles(guild, member, saved.plate, request.display_name, saved.rank_code || code);

        await db.run(
            "UPDATE verification_requests SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
            [interaction.user.id, now, request.id]
        );

        const resultEmbed = EmbedBuilder.from(interaction.message.embeds[0] || new EmbedBuilder())
            .setColor(config.colors.success)
            .setTitle("✅ Verificación aprobada")
            .addFields({ name: "Identificación asignada", value: `\`${nick}\``, inline: false });

        await interaction.update({
            content: `Aprobada por <@${interaction.user.id}>.`,
            embeds: [resultEmbed],
            components: []
        });

        await member.send(
            `✅ **Verificación completada.**\nTu identificación es: **${nick}**\nYa tienes acceso a los canales de la unidad.`
        ).catch(() => null);
    },

    async syncNickname(guild, userId, profile) {
        if (!profile?.plate || !profile?.display_name) return;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        const resolved = resolveMemberRank(member);
        const code = resolved.code || profile.rank_code || rankCodeFor(profile.rank);
        const nick = buildNickname(profile.plate, profile.display_name, code);
        await member.setNickname(nick, "Actualización de rango / identidad").catch(() => null);
        return nick;
    }
};
