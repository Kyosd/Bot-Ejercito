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

// ============================================================
// INICIAR PANEL
// ============================================================
async function start(bot, interaction, channelId) {
    if (!canSend(interaction.member)) {
        return interaction.reply({
            content: "⛔ No tienes autorización para emitir comunicados oficiales.",
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
            .setLabel("Comunicado Embed")
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
            content: "⛔ No tienes autorización para usar este control.",
            ephemeral: true
        });
    }

    const channelId = id.split("_")[1];

    // Modal embed
    if (id.startsWith("scmodal_")) {
        const modal = new ModalBuilder()
            .setCustomId(`scmodal_submit_${channelId}`)
            .setTitle("Redactar Comunicado Oficial");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_title")
                    .setLabel("Título del Comunicado")
                    .setPlaceholder("Ejemplo: ORDEN DEL DÍA — BATALLÓN")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_content")
                    .setLabel("Cuerpo del Comunicado")
                    .setPlaceholder("Escribe el comunicado militar aquí...")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
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
    const channel = interaction.guild?.channels?.cache?.get(channelId);

    if (!channel) {
        return interaction.reply({ content: "Error: canal militar no encontrado.", ephemeral: true });
    }

    // Embed
    if (id.startsWith("scmodal_submit_")) {
        const title = interaction.fields.getTextInputValue("msg_title");
        const content = interaction.fields.getTextInputValue("msg_content");

        const embed = new EmbedBuilder()
            .setColor(config?.embedColor || coreConfig.colors.embed)
            .setTitle(`🎖️ ${title}`)
            .setDescription(content)
            .setFooter({ text: `Emitido por ${interaction.user.tag}` })
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        return interaction.reply({
            content: `✅ Comunicado embed transmitido con éxito en <#${channelId}>.`,
            ephemeral: true
        });
    }

    // Normal
    if (id.startsWith("scnormal_submit_")) {
        const content = interaction.fields.getTextInputValue("msg_content");

        await channel.send(content);

        return interaction.reply({
            content: `✅ Mensaje transmitido con éxito en <#${channelId}>.`,
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
        console.log("[sendCenter] Módulo cargado correctamente.");
    },

    start,
    handleButton,
    handleModal
};
