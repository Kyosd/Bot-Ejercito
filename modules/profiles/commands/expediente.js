// modules/profiles/commands/expediente.js
"use strict";

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { getWeekStart } = require("../../../core/week");
const { resolveMemberRank, resolveMemberDivision, rankCodeFor } = require("../../../core/identity");

function hm(minutes) {
    const n = Math.max(0, Number(minutes) || 0);
    return `${Math.floor(n / 60)}h ${n % 60}m`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("expediente")
        .setDescription("Consulta la hoja de vida militar y estadísticas de un soldado")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a consultar (opcional, por defecto tú mismo)")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        const targetUser = interaction.options.getUser("soldado") || interaction.user;
        const userId = targetUser.id;
        const db = bot.db;

        // Obtener GuildMember para resolver roles de Discord en tiempo real
        const member = interaction.guild?.members.cache.get(userId)
            || await interaction.guild?.members.fetch(userId).catch(() => null);

        const resolvedRank = resolveMemberRank(member);
        const resolvedDivision = resolveMemberDivision(member, "Infantería");

        let profile = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [userId]);
        if (!profile) {
            await db.run(
                "INSERT INTO soldier_profiles (user_id, rank, division, joined_at, medals, rank_code) VALUES (?, ?, ?, ?, '[]', ?)",
                [userId, resolvedRank.rank, resolvedDivision, Date.now(), resolvedRank.code]
            );
            profile = {
                user_id: userId,
                rank: resolvedRank.rank,
                division: resolvedDivision,
                joined_at: Date.now(),
                medals: "[]",
                notes: "",
                display_name: null,
                plate: null,
                rank_code: resolvedRank.code,
                verified_at: null
            };
        } else {
            // Sincronizar automáticamente en BD si sus roles de Discord cambiaron
            if (profile.rank !== resolvedRank.rank || profile.rank_code !== resolvedRank.code || profile.division !== resolvedDivision) {
                await db.run(
                    "UPDATE soldier_profiles SET rank = ?, rank_code = ?, division = ? WHERE user_id = ?",
                    [resolvedRank.rank, resolvedRank.code, resolvedDivision, userId]
                ).catch(() => null);
                profile.rank = resolvedRank.rank;
                profile.rank_code = resolvedRank.code;
                profile.division = resolvedDivision;
            }
        }

        // Estado del servicio
        const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);
        const absence = await bot.modules?.absences?.service?.isAbsent(userId).catch(() => null);

        let estadoServicio = "<:online:1565829960638267414> **Libre de Servicio**";
        if (absence) {
            estadoServicio = `<a:offline:1567957044928192673> **Inactivo / Permiso Militar**\n└ *Motivo:* ${absence.reason} (Retorno: \`${absence.duration}\`)`;
        } else if (active) {
            if (active.paused_at) {
                estadoServicio = `<:paused:1565446432058638386> **En Pausa** (desde <t:${Math.floor(active.paused_at / 1000)}:R>)`;
            } else {
                estadoServicio = `<:active:1565445915781763336> **En Servicio Activo** (iniciado <t:${Math.floor(active.start / 1000)}:R>)`;
            }
        }

        const hoursMod = bot.modules?.hours;
        let weeklyMinutes = 0;
        if (hoursMod?.weekly) {
            weeklyMinutes = await hoursMod.weekly.getUserWeeklyMinutes(bot, userId);
        }

        const totalRow = await db.get("SELECT SUM(duration) AS total FROM hours_sessions WHERE user_id = ?", [userId]);
        const totalMinutes = Number(totalRow?.total || 0);

        const warnRow = await db.get("SELECT warnings FROM soldier_warnings WHERE soldier_id = ?", [userId]);
        const warnings = warnRow?.warnings || 0;
        const blocked = await db.get("SELECT reason FROM hours_blocked WHERE user_id = ?", [userId]);

        let disciplinario = `<a:alert:1565453809038262432> **Advertencias:** \`${warnings}/3\``;
        if (blocked) {
            disciplinario += `\n<:suspended:1565457686806397093> **ESTADO:** \`SUSPENDIDO / CORTE MARCIAL\`\n*Motivo:* ${blocked.reason}`;
        } else if (warnings === 0) {
            disciplinario += "\n<:verified:1565457686806397093> **Conducta:** `Impecable`";
        }

        let medalsList = "Sin condecoraciones aún.";
        try {
            const parsed = JSON.parse(profile.medals || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
                medalsList = parsed.join(" • ");
            }
        } catch (_) {}

        const weekStart = await getWeekStart(db);
        const arrestsWeek = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ? AND created_at >= ?",
            [userId, weekStart]
        ).catch(() => ({ n: 0 }));
        const arrestsTotal = await db.get(
            "SELECT COUNT(*) AS n FROM arrests WHERE soldier_id = ?",
            [userId]
        ).catch(() => ({ n: 0 }));
        const lastArrest = await db.get(
            "SELECT civilian_name, infraction_label, created_at FROM arrests WHERE soldier_id = ? ORDER BY created_at DESC LIMIT 1",
            [userId]
        ).catch(() => null);

        const suppliesWeek = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ? AND created_at >= ?",
            [userId, weekStart]
        ).catch(() => ({ n: 0 }));
        const suppliesTotal = await db.get(
            "SELECT COALESCE(SUM(amount), 0) AS n FROM supplies WHERE soldier_id = ?",
            [userId]
        ).catch(() => ({ n: 0 }));

        const code = resolvedRank.code || profile.rank_code || rankCodeFor(profile.rank);
        const rankName = resolvedRank.rank || profile.rank || "Recluta";
        const divisionName = resolvedDivision || profile.division || "Infantería";

        const identity = profile.plate
            ? `\`[${profile.plate}] ${profile.display_name || targetUser.username} ${code}\``
            : "`Sin placa — pendiente de verificación`";
        const verified = profile.verified_at
            ? `<a:verified:1563959567191244892> Verificado <t:${Math.floor(Number(profile.verified_at) / 1000)}:d>`
            : "<a:unverified:1565457686806397093> Sin verificar";

        let arrestLine = `• **Semana:** \`${Number(arrestsWeek?.n || 0)}\` efectuados\n• **Total:** \`${Number(arrestsTotal?.n || 0)}\` efectuados`;
        if (lastArrest) {
            const civText = lastArrest.civilian_name ? ` (${lastArrest.civilian_name})` : "";
            arrestLine += `\n• **Último:** ${lastArrest.infraction_label}${civText} (<t:${Math.floor(lastArrest.created_at / 1000)}:R>)`;
        }

        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(`<:profile:1565472624921018491> EXPEDIENTE MILITAR — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setDescription(`Identidad operativa: ${identity}\n${verified}`)
            .addFields([
                { name: "<:soldier:1567962392921505963> Soldado", value: `<@${userId}>`, inline: true },
                { name: "<:rank:1567997890356445373> Rango", value: `**${rankName}** ${code}`, inline: true },
                { name: "<:division:1567999300116414494> División", value: `**${divisionName}**`, inline: true },
                { name: "<:status:1565445915781763336> Estado actual", value: estadoServicio, inline: false },
                { name: "<a:clock:1563960095950245888> Servicio", value: `• **Semana:** \`${hm(weeklyMinutes)}\`\n• **Histórico:** \`${hm(totalMinutes)}\``, inline: true },
                { name: "<:discipline:1568001868964167781> Disciplina", value: disciplinario, inline: true },
                { name: "<a:arrest:1565823848610406523> Arrestos", value: arrestLine, inline: true },
                { name: "<:supplies:1568241632489508945> Abastecimiento", value: `• **Semana:** \`${Number(suppliesWeek?.n || 0)}\`\n• **Total:** \`${Number(suppliesTotal?.n || 0)}\``, inline: true },
                { name: "<:stars:1568242028213706752> Condecoraciones", value: medalsList, inline: false }
            ])
            .setFooter({ text: "Comando General • Sistema Táctico de Personal" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
