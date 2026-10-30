// modules/profiles/commands/asignarrango.js
"use strict";

const { SlashCommandBuilder } = require("discord.js");
const coreConfig = require("../../../core/config");
const { rankCodeFor } = require("../../../core/identity");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("asignarrango")
        .setDescription("Asigna o actualiza el rango y división militar de un soldado (Solo Mando)")
        .addUserOption(opt =>
            opt.setName("soldado")
                .setDescription("Soldado a actualizar")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("rango")
                .setDescription("Nuevo rango militar (Ej: Sargento, Teniente, Capitán)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("division")
                .setDescription("División táctica (Ej: Fuerzas Especiales, Infantería, Blindados)")
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("medalla")
                .setDescription("Añadir una condecoración (Ej: 🎖️ Medalla de Honor)")
                .setRequired(false)
        ),

    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "⛔ No tienes autorización del Alto Mando para modificar rangos militares.",
                ephemeral: true
            });
        }

        const target = interaction.options.getUser("soldado");
        const rank = interaction.options.getString("rango");
        const division = interaction.options.getString("division") || "Infantería";
        const newMedal = interaction.options.getString("medalla");

        const db = bot.db;

        // Obtener perfil existente
        let profile = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [target.id]);
        let medals = [];

        if (profile) {
            try {
                medals = JSON.parse(profile.medals || "[]");
            } catch (_) {}
        }

        if (newMedal && !medals.includes(newMedal)) {
            medals.push(newMedal);
        }

        const medalsJson = JSON.stringify(medals);
        const rankCode = rankCodeFor(rank);

        await db.run(
            `
            INSERT INTO soldier_profiles (user_id, rank, division, joined_at, medals, rank_code)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                rank = excluded.rank,
                division = excluded.division,
                medals = excluded.medals,
                rank_code = excluded.rank_code
        `,
            [target.id, rank, division, Date.now(), medalsJson, rankCode]
        );

        const updated = await db.get("SELECT * FROM soldier_profiles WHERE user_id = ?", [target.id]);
        if (updated?.plate && updated?.display_name && bot.modules?.verify?.service?.syncNickname) {
            await bot.modules.verify.service.syncNickname(interaction.guild, target.id, updated);
        }

        return interaction.reply({
            content: `🎖️ **Expediente actualizado:** El soldado <@${target.id}> ha sido asignado al rango **${rank}** (${rankCode}) en la división **${division}**.${newMedal ? `\n🏅 Se le otorgó la condecoración: *${newMedal}*.` : ""}`,
            ephemeral: false
        });
    }
};
