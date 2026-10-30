"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const config = require("./config");
const { rel, minutesToHM } = require("./utils");

async function getRosterLines(bot) {
    const rows = await bot.db.all(
        "SELECT user_id, start, paused_at FROM hours_active ORDER BY start ASC",
        []
    );

    let activeCount = 0;
    let pausedCount = 0;
    const lines = [];

    for (const r of rows || []) {
        const who = `<@${r.user_id}>`;
        if (r.paused_at) {
            pausedCount++;
            lines.push(`<:pausa:1565443867585810523> ${who} · pausa ${rel(Number(r.paused_at))}`);
        } else {
            activeCount++;
            lines.push(`<:active:1565445915781763336> ${who} · en guardia desde ${rel(Number(r.start))}`);
        }
    }

    return {
        rows: rows || [],
        activeCount,
        pausedCount,
        text: lines.length ? lines.join("\n") : "*Nadie en servicio ahora mismo <a:load:1563965456891641938>*"
    };
}

async function getWeeklyTop(bot) {
    const weekly = bot.modules?.hours?.weekly;
    if (!weekly?.ensureMeta) return "*Sin datos semanales.*";
    const resetAt = await weekly.ensureMeta(bot);
    const rows = await bot.db.all(
        `
        SELECT user_id, SUM(duration) AS total
        FROM hours_sessions
        WHERE start >= ?
        GROUP BY user_id
        ORDER BY total DESC
        LIMIT 3
        `,
        [resetAt]
    );
    if (!rows?.length) return "*Aún no hay horas esta semana.*";
    return rows.map((r, i) => {
        const t = minutesToHM(r.total);
        const medal = ["🥇", "🥈", "🥉"][i] || "•";
        return `${medal} <@${r.user_id}> — **${t.text}**`;
    }).join("\n");
}

function buildButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("HOURS_SERVICE_IN")
            .setLabel("Entrar")
            .setEmoji("<a:escribiendo:1563959662003622014>")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("HOURS_SERVICE_PAUSE")
            .setLabel("Pausa")
            .setEmoji("<:pausa:1565446432058638386>")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("HOURS_SERVICE_OUT")
            .setLabel("Salir")
            .setEmoji("<:salir:1565446798586282165>")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("HOURS_MY_STATUS")
            .setLabel("Mi estado")
            .setEmoji("<a:estado:1565448013218848949>")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("HOURS_GENERAL_PANEL")
            .setLabel("Mando")
            .setEmoji("<a:mando:1563959904178536489>")
            .setStyle(ButtonStyle.Secondary)
    );
}

async function buildControlPayload(bot) {
    const roster = await getRosterLines(bot);
    const top = await getWeeklyTop(bot);
    const now = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
        .setColor(config.colors.ui)
        .setTitle("<a:reglas:1563965558884671638> Centro de Mando — Servicio en vivo")
        .setDescription(
            "Marca tu turno desde este panel. El tiempo en pausa **no** suma horas."
        )
        .addFields(
            {
                name: `👥 Guardia actual · ${roster.rows.length}`,
                value: roster.text.slice(0, 1024),
                inline: false
            },
            { name: "<a:check:1563959567191244892> Activos", value: `**${roster.activeCount}**`, inline: true },
            { name: "<:pausa:1565443867585810523> En pausa", value: `**${roster.pausedCount}**`, inline: true },
            { name: "<a:reloj:1563960095950245888> Reloj", value: `<t:${now}:t>`, inline: true },
            { name: "<a:copa:1563966910264246293> Top semanal", value: top.slice(0, 1024), inline: false }
        )
        .setFooter({ text: `${config.system.footer} • sincronizado` })
        .setTimestamp(Date.now());

    return { embeds: [embed], components: [buildButtons()] };
}

async function buildRosterOnlyEmbed(bot) {
    const roster = await getRosterLines(bot);
    return new EmbedBuilder()
        .setColor(config.colors.ui)
        .setTitle("<:active:1565445915781763336> Personal en servicio táctico")
        .setDescription(roster.text.slice(0, 4096))
        .addFields(
            { name: "<a:check:1563959567191244892> Activos", value: `${roster.activeCount}`, inline: true },
            { name: "<:pausa:1565443867585810523> En pausa", value: `${roster.pausedCount}`, inline: true },
            { name: "<a:reloj:1563960095950245888> Total en guardia", value: `${roster.rows.length}`, inline: true }
        )
        .setFooter({ text: `Sincronizado • ${new Date().toLocaleTimeString("es-ES")}` });
}

module.exports = {
    getRosterLines,
    buildControlPayload,
    buildRosterOnlyEmbed
};
