const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const config = require("../../core/config");
const weekly = require("./weekly");

/* ---------------------------------------------- */
/*                VALIDADOR DE GENERALES          */
/* ---------------------------------------------- */
function isGeneral(memberOrId) {
    const ids = config.generals;

    // Si se pasa un string (userId)
    if (typeof memberOrId === "string") {
        return ids.includes(memberOrId);
    }

    // Si se pasa un GuildMember
    if (memberOrId?.id && ids.includes(memberOrId.id)) {
        return true;
    }

    // Si tiene roles en la lista
    if (memberOrId?.roles?.cache) {
        return memberOrId.roles.cache.some(role => ids.includes(role.id));
    }

    return false;
}

/* ---------------------------------------------- */
/*               FACTORÍA DE MODALS               */
/* ---------------------------------------------- */
function createUserModal(customId, title, requireMinutes = false) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const userInput = new TextInputBuilder()
        .setCustomId("TARGET_USER_ID")
        .setLabel("ID del usuario")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(userInput));

    if (requireMinutes) {
        const minutesInput = new TextInputBuilder()
            .setCustomId("TARGET_MINUTES")
            .setLabel("Cantidad de minutos")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(minutesInput));
    }

    return modal;
}

/* ---------------------------------------------- */
/*                MÓDULO PRINCIPAL                */
/* ---------------------------------------------- */
module.exports = {

    /* ---------------------------------------------- */
    /*               PANEL DE GENERALES               */
    /* ---------------------------------------------- */
    async openPanel(bot, interaction) {

        if (!isGeneral(interaction.member)) {
            return interaction.reply({
                content: "No tienes autorización para acceder al Panel de Generales.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.style.color)
            .setTitle(`🎖️ Panel de Generales — ${config.style.systemName}`)
            .setDescription(
                "Herramientas tácticas para administración de horas de servicio.\n\n" +
                "**Opciones disponibles:**\n" +
                "1️⃣ Forzar salida de un soldado\n" +
                "2️⃣ Añadir horas manualmente\n" +
                "3️⃣ Quitar horas manualmente\n" +
                "4️⃣ Resetear horas de un soldado\n" +
                "5️⃣ Resetear horas de todos\n" +
                "6️⃣ Ver historial semanal de un soldado\n" +
                "7️⃣ Ver historial total de un soldado\n" +
                "8️⃣ Bloquear a un soldado\n" +
                "9️⃣ Desbloquear a un soldado\n" +
                "🔟 Ver reporte semanal manual\n"
            )
            .setFooter({ text: config.style.footer });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("HOURS_GENERAL_FORCE_OUT").setLabel("1️⃣ Forzar salida").setStyle("Danger"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_ADD_HOURS").setLabel("2️⃣ Añadir horas").setStyle("Primary"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_REMOVE_HOURS").setLabel("3️⃣ Quitar horas").setStyle("Secondary")
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("HOURS_GENERAL_RESET_USER").setLabel("4️⃣ Reset usuario").setStyle("Secondary"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_RESET_ALL").setLabel("5️⃣ Reset todos").setStyle("Danger"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_HISTORY_WEEK").setLabel("6️⃣ Historial semanal").setStyle("Primary")
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("HOURS_GENERAL_HISTORY_TOTAL").setLabel("7️⃣ Historial total").setStyle("Primary"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_BLOCK").setLabel("8️⃣ Bloquear").setStyle("Danger"),
            new ButtonBuilder().setCustomId("HOURS_GENERAL_UNBLOCK").setLabel("9️⃣ Desbloquear").setStyle("Success")
        );

        const row4 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("HOURS_GENERAL_WEEKLY_REPORT").setLabel("🔟 Reporte semanal").setStyle("Primary")
        );

        return interaction.reply({
            embeds: [embed],
            components: [row1, row2, row3, row4],
            ephemeral: true
        });
    },

    /* ---------------------------------------------- */
    /*              BOTONES DEL PANEL                 */
    /* ---------------------------------------------- */
    async handleButton(bot, interaction) {

        if (!isGeneral(interaction.member)) {
            return interaction.reply({
                content: "No tienes autorización para ejecutar acciones de general.",
                ephemeral: true
            });
        }

        const id = interaction.customId;
        const db = bot.db;

        const modalActions = {
            "HOURS_GENERAL_FORCE_OUT": ["MOD_HOURS_FORCE_OUT", "Forzar salida de soldado", false],
            "HOURS_GENERAL_ADD_HOURS": ["MOD_HOURS_ADD_HOURS", "Añadir horas manualmente", true],
            "HOURS_GENERAL_REMOVE_HOURS": ["MOD_HOURS_REMOVE_HOURS", "Quitar horas manualmente", true],
            "HOURS_GENERAL_RESET_USER": ["MOD_HOURS_RESET_USER", "Resetear horas de un soldado", false],
            "HOURS_GENERAL_HISTORY_WEEK": ["MOD_HOURS_HISTORY_WEEK", "Historial semanal de un soldado", false],
            "HOURS_GENERAL_HISTORY_TOTAL": ["MOD_HOURS_HISTORY_TOTAL", "Historial total de un soldado", false],
            "HOURS_GENERAL_BLOCK": ["MOD_HOURS_BLOCK", "Bloquear soldado", false],
            "HOURS_GENERAL_UNBLOCK": ["MOD_HOURS_UNBLOCK", "Desbloquear soldado", false],
        };

        if (modalActions[id]) {
            const [customId, title, needMinutes] = modalActions[id];
            const modal = createUserModal(customId, title, needMinutes);
            return interaction.showModal(modal);
        }

        if (id === "HOURS_GENERAL_RESET_ALL") {
            await db.run("DELETE FROM hours_active");
            await db.run("DELETE FROM hours_sessions");

            return interaction.reply({
                content: "Todas las horas y servicios activos han sido reseteados.",
                ephemeral: true
            });
        }

        if (id === "HOURS_GENERAL_WEEKLY_REPORT") {
            return weekly.generate(bot, false, interaction, true);
        }
    },

    /* ---------------------------------------------- */
    /*                  MANEJO DE MODALS              */
    /* ---------------------------------------------- */
    async handleModal(bot, interaction) {

        if (!isGeneral(interaction.member)) {
            return interaction.reply({
                content: "No tienes autorización para ejecutar acciones de general.",
                ephemeral: true
            });
        }

        const db = bot.db;
        const id = interaction.customId;

        const userId = interaction.fields.getTextInputValue("TARGET_USER_ID");
        const minutesRaw = interaction.fields.getTextInputValue("TARGET_MINUTES") || null;
        const minutes = minutesRaw ? parseInt(minutesRaw, 10) : null;

        /* ---------------------------------------------- */
        /*           FORZAR SALIDA DE SERVICIO            */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_FORCE_OUT") {
            const active = await db.get("SELECT * FROM hours_active WHERE user_id = ?", [userId]);

            if (!active) {
                return interaction.reply({ content: "Ese usuario no tiene un servicio activo.", ephemeral: true });
            }

            const now = Date.now();
            const mins = Math.floor((now - active.start) / 60000);

            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, active.start, now, mins]
            );

            await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);

            return interaction.reply({
                content: `Salida forzada aplicada a <@${userId}>. Se registran **${mins} minutos**.`,
                ephemeral: true
            });
        }

        /* ---------------------------------------------- */
        /*           AÑADIR HORAS MANUALMENTE            */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_ADD_HOURS") {
            if (!minutes || isNaN(minutes)) {
                return interaction.reply({ content: "Los minutos ingresados no son válidos.", ephemeral: true });
            }

            const now = Date.now();

            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, now, now, minutes]
            );

            return interaction.reply({
                content: `Se han añadido **${minutes} minutos** a <@${userId}>.`,
                ephemeral: true
            });
        }

        /* ---------------------------------------------- */
        /*           QUITAR HORAS MANUALMENTE            */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_REMOVE_HOURS") {
            if (!minutes || isNaN(minutes)) {
                return interaction.reply({ content: "Los minutos ingresados no son válidos.", ephemeral: true });
            }

            const now = Date.now();

            await db.run(
                "INSERT INTO hours_sessions (user_id, start, end, duration) VALUES (?, ?, ?, ?)",
                [userId, now, now, -Math.abs(minutes)]
            );

            return interaction.reply({
                content: `Se han restado **${minutes} minutos** a <@${userId}>.`,
                ephemeral: true
            });
        }

        /* ---------------------------------------------- */
        /*           RESET HORAS DE UN USUARIO           */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_RESET_USER") {
            await db.run("DELETE FROM hours_active WHERE user_id = ?", [userId]);
            await db.run("DELETE FROM hours_sessions WHERE user_id = ?", [userId]);

            return interaction.reply({
                content: `Se han reseteado todas las horas de <@${userId}>.`,
                ephemeral: true
            });
        }

        /* ---------------------------------------------- */
        /*         HISTORIAL SEMANAL DE UN SOLDADO        */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_HISTORY_WEEK") {
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
                .setColor(config.style.color)
                .setTitle(`📘 Historial semanal — <@${userId}>`)
                .setDescription(desc + `\n**Total semanal:** ${th}h ${tm}m`)
                .setFooter({ text: config.style.footer });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        /* ---------------------------------------------- */
        /*           HISTORIAL TOTAL DEL USUARIO          */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_HISTORY_TOTAL") {
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
                .setColor(config.style.color)
                .setTitle(`📘 Historial total — <@${userId}>`)
                .setDescription(desc + `\n**Total histórico:** ${th}h ${tm}m`)
                .setFooter({ text: config.style.footer });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        /* ---------------------------------------------- */
        /*             BLOQUEAR / DESBLOQUEAR             */
        /* ---------------------------------------------- */
        if (id === "MOD_HOURS_BLOCK") {
            await db.run("INSERT OR REPLACE INTO hours_blocked (user_id) VALUES (?)", [userId]);

            return interaction.reply({
                content: `<@${userId}> ha sido bloqueado para registrar servicio.`,
                ephemeral: true
            });
        }

        if (id === "MOD_HOURS_UNBLOCK") {
            await db.run("DELETE FROM hours_blocked WHERE user_id = ?", [userId]);

            return interaction.reply({
                content: `<@${userId}> ha sido desbloqueado.`,
                ephemeral: true
            });
        }
    }
};
