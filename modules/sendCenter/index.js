const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");

const coreConfig = require("../../core/config");
let config = null;

// ============================================================
// PERMISOS
// ============================================================
function canSend(member) {
    if (!member) return false;
    if (coreConfig.isGeneral(member)) return true;

    const id = member.id;
    const hasUser = config?.allowedUsers?.includes(id);
    const hasRole = member.roles?.cache?.some(r => config?.allowedRoles?.includes(r.id));

    return hasUser || hasRole;
}

function isValidHttpUrl(string) {
    if (!string) return false;
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

// ============================================================
// INICIAR PANEL
// ============================================================
async function start(bot, interaction, channelId) {
    if (!canSend(interaction.member)) {
        return interaction.reply({
            content: "<:forbidden:1568246186702274733> No tienes autorización para emitir comunicados oficiales.",
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle("📡 Centro de Transmisión Militar")
        .setColor(config?.embedColor || coreConfig.colors.embed)
        .setDescription(`Canal de destino: <#${channelId}>\n\nSelecciona el formato oficial de emisión del comunicado:`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`scmodal_${channelId}`)
            .setLabel("Comunicado Embed Decorado")
            .setEmoji("📄")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`scnormal_${channelId}`)
            .setLabel("Mensaje Normal")
            .setEmoji("💬")
            .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

// ============================================================
// BOTONES
// ============================================================
async function handleButton(bot, interaction) {
    const id = interaction.customId;
    if (!id) return;

    if (!canSend(interaction.member)) {
        return interaction.reply({
            content: "<:forbidden:1568246186702274733> No tienes autorización para usar este control.",
            ephemeral: true
        });
    }

    const channelId = id.split("_")[1];

    // Modal embed decorado
    if (id.startsWith("scmodal_")) {
        const modal = new ModalBuilder()
            .setCustomId(`scmodal_submit_${channelId}`)
            .setTitle("Redactar Comunicado Oficial");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_title")
                    .setLabel("Título del Comunicado")
                    .setPlaceholder("Ejemplo: ORDEN DEL DÍA — COMANDO GENERAL")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(250)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_content")
                    .setLabel("Cuerpo / Contenido del Comunicado")
                    .setPlaceholder("Escribe el contenido militar oficial aquí...")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_image")
                    .setLabel("Imagen grande / Banner (URL opcional)")
                    .setPlaceholder("https://i.imgur.com/tu_banner.png")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_thumb")
                    .setLabel("Miniatura / Escudo lateral (URL opcional)")
                    .setPlaceholder("https://i.imgur.com/tu_escudo.png")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_footer")
                    .setLabel("Pie de página / Firma militar (Opcional)")
                    .setPlaceholder("Ejemplo: Estado Mayor • División de Operaciones")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(200)
            )
        );

        return interaction.showModal(modal);
    }

    // Modal normal
    if (id.startsWith("scnormal_")) {
        const modal = new ModalBuilder()
            .setCustomId(`scnormal_submit_${channelId}`)
            .setTitle("Mensaje Oficial Directo");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_content")
                    .setLabel("Escribe el mensaje")
                    .setPlaceholder("Escribe el texto que se enviará tal cual...")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            )
        );

        return interaction.showModal(modal);
    }
}

// ============================================================
// MODAL SUBMIT
// ============================================================
async function handleModal(bot, interaction) {
    const id = interaction.customId;
    const channelId = id.split("_")[2];
    const channel = interaction.guild?.channels?.cache?.get(channelId) ||
        await interaction.guild?.channels?.fetch(channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: "<a:alert:1565453809038262432> Error: canal militar no encontrado o no es de texto.", ephemeral: true });
    }

    // Embed decorado
    if (id.startsWith("scmodal_submit_")) {
        const title = interaction.fields.getTextInputValue("msg_title").trim();
        const content = interaction.fields.getTextInputValue("msg_content").trim();
        const imageUrl = interaction.fields.getTextInputValue("msg_image")?.trim() || null;
        const thumbUrl = interaction.fields.getTextInputValue("msg_thumb")?.trim() || null;
        const footerText = interaction.fields.getTextInputValue("msg_footer")?.trim() || null;

        const embedColor = config?.embedColor || coreConfig.colors.militaryGold || "#2d5a27";

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`🎖️ ${title}`)
            .setDescription(content)
            .setTimestamp();

        // Footer táctico personalizado
        if (footerText) {
            embed.setFooter({
                text: `${footerText} • Emitido por ${interaction.user.tag || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ size: 64 })
            });
        } else {
            embed.setFooter({
                text: `Comando General • Emitido por ${interaction.user.tag || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ size: 64 })
            });
        }

        // Imagen principal
        if (imageUrl && isValidHttpUrl(imageUrl)) {
            embed.setImage(imageUrl);
        }

        // Miniatura
        if (thumbUrl && isValidHttpUrl(thumbUrl)) {
            embed.setThumbnail(thumbUrl);
        }

        await channel.send({ embeds: [embed] });

        return interaction.reply({
            content: `<a:check:1563959567191244892> **Comunicado oficial decorado transmitido con éxito en** <#${channelId}>.`,
            ephemeral: true
        });
    }

    // Normal
    if (id.startsWith("scnormal_submit_")) {
        const content = interaction.fields.getTextInputValue("msg_content");

        await channel.send(content);

        return interaction.reply({
            content: `<a:check:1563959567191244892> **Mensaje transmitido con éxito en** <#${channelId}>.`,
            ephemeral: true
        });
    }
}

// ============================================================
// EXPORTAR
// ============================================================
module.exports = {
    name: "sendCenter",
    commands: [require("./commands/sendcenter.js")],
    events: [require("./events/interaction.js")],

    onLoad(bot) {
        config = require("./config.js");
        console.log("[sendCenter] Módulo cargado correctamente");
    },

    start,
    handleButton,
    handleModal
};
