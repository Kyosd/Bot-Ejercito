"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const weekly = require("./weekly");
const config = require("./config");
const logs   = require("./logs");

/* --------------------------- helpers --------------------------- */

function isGeneral(memberOrId) {
    const ids = config.generals || [];
    if (!ids.length) return false;

    if (typeof memberOrId === "string") {
        return ids.includes(memberOrId);
    }

    if (!memberOrId) return false;

    if (ids.includes(memberOrId.id)) return true;

    if (memberOrId.roles?.cache) {
        return memberOrId.roles.cache.some(r => ids.includes(r.id));
    }

    return false;
}

/* ----------------------------- módulo -------------------------- */

module.exports = {

    async openPanel(bot, interaction) {
        if (!isGeneral(interaction.member ?? interaction.user)) {
            return interaction.reply({
                content: "No tienes autorización para acceder al Panel de Generales.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(`🎖️ Panel de Generales — ${config.system.name}`)
            .setDescription(
                "Centro de mando táctico para administración de horas.\n\n" +
                "Selecciona una operación del menú desplegable."
            )
            .setFooter({ text: config.system.footer });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("HOURS_GENERAL_MENU")
                .setPlaceholder("Selecciona una operación militar…")
                .addOptions([
                    { label: "Ver soldados en servicio",            value: "IN_SERVICE" },
                    { label: "Forzar salida de un soldado",          value: "FORCE_OUT" },
                    { label: "Añadir horas manualmente",             value: "ADD_HOURS" },
                    { label: "Quitar horas manualmente",             value: "REMOVE_HOURS" },
                    { label: "Resetear horas de un soldado",         value: "RESET_USER" },
                    { label: "Resetear horas de todos",              value: "RESET_ALL" },
                    { label: "Historial semanal de un soldado",      value: "HISTORY_WEEK" },
                    { label: "Historial total de un soldado",        value: "HISTORY_TOTAL" },
                    { label: "Bloquear soldado",                     value: "BLOCK" },
                    { label: "Desbloquear soldado",                  value: "UNBLOCK" },
                    { label: "Reporte semanal (manual)",             value: "WEEKLY_REPORT" }
                ])
        );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },

    // primer select: tipo de operación
    async handleGeneralMenu(bot, interaction) {
        if (!isGeneral(interaction.member ?? interaction.user)) {
            return interaction.reply({
                content: "No tienes autorización para ejecutar acciones de general.",
                ephemeral: true
            });
        }

        const db = bot.db;
        const option = interaction.values?.[0];

        if (!option) {
            return interaction.reply({
                content: "Acción no válida.",
                ephemeral: true
            });
        }

        // 1) Ver soldados actualmente en servicio
        if (option === "IN_SERVICE") {
            const rows = await db.all("SELECT * FROM hours_active");

            if (!rows.length) {
                return interaction.reply({
                    content: "No hay soldados en servicio actualmente.",
                    ephemeral: true
                });
            }

            let desc = "";
            for (const r of rows) {
                const user = bot.client.users.cache.get(r.user_id);
                desc += `• ${user ? user.tag : r.user_id} — desde <t:${Math.floor(r.start / 1000)}:R>\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(config.colors.embed)
                .setTitle("👁️ Soldados en servicio")
                .setDescription(desc)
                .setFooter({ text: config.system.footer });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 2) Reset total
        if (option === "RESET_ALL") {
            await db.run("DELETE FROM hours_active");
            await db.run("DELETE FROM hours_sessions");

            await logs.resetAll(bot, interaction.user);

            return interaction.reply({
                content: "Todas las horas y servicios activos han sido reseteados.",
                ephemeral: true
            });
        }

        // 3) Reporte semanal manual
        if (option === "WEEKLY_REPORT") {
            return weekly.generate(bot, false, interaction, true);
        }

        // 4) Operaciones que requieren selección de soldado
        let rows;

        if (option === "FORCE_OUT") {
            rows = await db.all("SELECT user_id FROM hours_active ORDER BY start ASC");
            if (!rows.length) {
                return interaction.reply({
                    content: "No hay soldados con servicio activo.",
                    ephemeral: true
                });
            }
        } else {
            rows = await db.all(`
                SELECT DISTINCT user_id FROM hours_sessions
                UNION
                SELECT user_id FROM hours_active
            `);

            if (!rows.length) {
                return interaction.reply({
                    content: "No hay soldados registrados en el sistema de horas.",
                    ephemeral: true
                });
            }
        }

        const options = rows.slice(0, 25).map(r => {
            const user = bot.client.users.cache.get(r.user_id);
            return {
                label: user ? user.tag : r.user_id,
                value: r.user_id
            };
        });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`HOURS_GENERAL_TARGET_${option}`)
                .setPlaceholder("Selecciona un soldado…")
                .addOptions(options)
        );

        return interaction.reply({
            content: "Selecciona el soldado objetivo.",
            components: [row],
            ephemeral: true
        });
    },

    // segundo select: elegir soldado en función de la operación
    async handleTargetSelect(bot, interaction) {
        if (!isGeneral(interaction.member ?? interaction.user)) {
            return interaction.reply({
                content: "No tienes autorización para ejecutar acciones de general.",
                ephemeral: true
            });
        }

        const db = bot.db;
        const id = interaction.customId;
        const action = id.replace("HOURS_GENERAL_TARGET_", "");
        const userId = interaction.values?.[0];

        if (!userId) {
            return interaction.reply({
                content: "No se ha seleccionado ningún soldado.",
                ephemeral: true
            });
        }

        // FORZAR SALIDA
        if (action === "FORCE_OUT") {
            const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);

            if (!active) {
                return interaction.reply({
                    content: "Ese soldado no tiene un servicio activo.",
                    ephemeral: true
                });
            }

            const now = Date.now();
            let minutes = Math.max(0, Math.floor((now - active.start) / 60000));
            if (minutes < config.settings.minSessionMinutes) {
                minutes = config.settings.minSessionMinutes;
            }

            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, active.start, now, minutes]
            );

            await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);

            await logs.forceOut(bot, interaction.user, userId, minutes);

            return interaction.reply({
                content: `Salida forzada aplicada a <@${userId}>. Se registran **${minutes} minutos**.`,
                ephemeral: true
            });
        }

        // ADD / REMOVE HORAS → abrir modal sólo con minutos
        if (action === "ADD_HOURS" || action === "REMOVE_HOURS") {
            const modal = new ModalBuilder()
                .setCustomId(`MOD_HOURS_${action}:${userId}`)
                .setTitle(action === "ADD_HOURS" ? "Añadir minutos de servicio" : "Quitar minutos de servicio");

            const minutesInput = new TextInputBuilder()
                .setCustomId("TARGET_MINUTES")
                .setLabel("Cantidad de minutos")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(minutesInput)
            );

            return interaction.showModal(modal);
        }

        // RESET USUARIO
        if (action === "RESET_USER") {
            await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);
            await db.run("DELETE FROM hours_sessions WHERE user_id = ?", [userId]);

            await logs.resetUser(bot, interaction.user, userId);

            return interaction.reply({
                content: `Se han reseteado todas las horas de <@${userId}>.`,
                ephemeral: true
            });
        }

        // HISTORIAL SEMANAL
        if (action === "HISTORY_WEEK") {
            const resetAt = await weekly.ensureMeta(bot);

            const rows = await db.all(
                "SELECT * FROM hours_sessions WHERE user_id = ? AND start >= ? ORDER BY start ASC",
                [userId, resetAt]
            );

            if (!rows.length) {
                return interaction.reply({
                    content: "Ese soldado no tiene horas registradas en la semana actual.",
                    ephemeral: true
                });
            }

            let desc = "";
            let total = 0;

            for (const s of rows) {
                total += s.duration;
                const h = Math.floor(s.duration / 60);
                const m = s.duration % 60;
                desc += `• <t:${Math.floor(s.start / 1000)}:f> → ${h}h ${m}m\n`;
            }

            const th = Math.floor(total / 60);
            const tm = total % 60;

            const embed = new EmbedBuilder()
                .setColor(config.colors.embed)
                .setTitle(`📘 Historial semanal — <@${userId}>`)
                .setDescription(desc + `\n**Total semanal:** ${th}h ${tm}m`)
                .setFooter({ text: config.system.footer });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // HISTORIAL TOTAL
        if (action === "HISTORY_TOTAL") {
            const rows = await db.all(
                "SELECT * FROM hours_sessions WHERE user_id = ? ORDER BY start ASC",
                [userId]
            );

            if (!rows.length) {
                return interaction.reply({
                    content: "Ese soldado no tiene horas registradas.",
                    ephemeral: true
                });
            }

            let desc = "";
            let total = 0;

            for (const s of rows) {
                total += s.duration;
                const h = Math.floor(s.duration / 60);
                const m = s.duration % 60;
                desc += `• <t:${Math.floor(s.start / 1000)}:f> → ${h}h ${m}m\n`;
            }

            const th = Math.floor(total / 60);
            const tm = total % 60;

            const embed = new EmbedBuilder()
                .setColor(config.colors.embed)
                .setTitle(`📘 Historial total — <@${userId}>`)
                .setDescription(desc + `\n**Total histórico:** ${th}h ${tm}m`)
                .setFooter({ text: config.system.footer });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // BLOQUEAR
        if (action === "BLOCK") {
            await db.run("INSERT OR REPLACE INTO hours_blocked (user_id) VALUES (?)", [userId]);

            await logs.block(bot, interaction.user, userId);

            return interaction.reply({
                content: `<@${userId}> ha sido bloqueado para registrar servicio.`,
                ephemeral: true
            });
        }

        // DESBLOQUEAR
        if (action === "UNBLOCK") {
            await db.run("DELETE FROM hours_blocked WHERE user_id = ?", [userId]);

            await logs.unblock(bot, interaction.user, userId);

            return interaction.reply({
                content: `<@${userId}> ha sido desbloqueado.`,
                ephemeral: true
            });
        }
    },

    // modals para ADD / REMOVE horas
    async handleModal(bot, interaction) {
        if (!isGeneral(interaction.member ?? interaction.user)) {
            return interaction.reply({
                content: "No tienes autorización para ejecutar acciones de general.",
                ephemeral: true
            });
        }

        const db = bot.db;

        const [prefix, actionAndUser] = interaction.customId.split("MOD_HOURS_");
        if (!actionAndUser) return;

        const [action, userId] = actionAndUser.split(":");
        const minutesRaw = interaction.fields.getTextInputValue("TARGET_MINUTES");
        const minutes = parseInt(minutesRaw, 10);

        if (!minutes || isNaN(minutes) || minutes <= 0) {
            return interaction.reply({
                content: "Los minutos ingresados no son válidos.",
                ephemeral: true
            });
        }

        const now = Date.now();

        if (action === "ADD_HOURS") {
            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, now, now, minutes]
            );

            await logs.manualAdd(bot, interaction.user, userId, minutes);

            return interaction.reply({
                content: `Se han añadido **${minutes} minutos** a <@${userId}>.`,
                ephemeral: true
            });
        }

        if (action === "REMOVE_HOURS") {
            const delta = -Math.abs(minutes);

            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, now, now, delta]
            );

            await logs.manualRemove(bot, interaction.user, userId, minutes);

            return interaction.reply({
                content: `Se han restado **${minutes} minutos** a <@${userId}>.`,
                ephemeral: true
            });
        }
    }
};
