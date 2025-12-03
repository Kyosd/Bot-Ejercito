const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");

let config = null;

// ============================================================
// PERMISOS
// ============================================================
function canSend(member) {
    if (!member) return false;

    const id = member.id;

    const hasUser = config.allowedUsers.includes(id);
    const hasRole = member.roles.cache.some(r => config.allowedRoles.includes(r.id));

    return hasUser || hasRole;
}

// ============================================================
// INICIAR PANEL
// ============================================================
async function start(bot, interaction, channelId) {

    if (!canSend(interaction.member)) {
        return interaction.reply({
            content: "No tienes autorización para usar este comando.",
            flags: 64
        });
    }

    const embed = new EmbedBuilder()
        .setTitle("📡 Método de Envío")
        .setColor(config.embedColor)
        .setDescription(`Canal seleccionado: <#${channelId}>\n\n¿Cómo deseas enviar el mensaje?`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`scmodal_${channelId}`)
            .setLabel("Mensaje Embed")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`scnormal_${channelId}`)
            .setLabel("Mensaje Normal")
            .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
        embeds: [embed],
        components: [row],
        flags: 64
    });
}

// ============================================================
// BOTONES
// ============================================================
async function handleButton(bot, interaction) {
    const id = interaction.customId;
    if (!id) return;

    const channelId = id.split("_")[1];

    // Modal embed
    if (id.startsWith("scmodal_")) {

        const modal = new ModalBuilder()
            .setCustomId(`scmodal_submit_${channelId}`)
            .setTitle("Mensaje Embed");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_title")
                    .setLabel("Título")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_content")
                    .setLabel("Contenido")
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
            .setTitle("Mensaje Normal");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("msg_content")
                    .setLabel("Escribe tu mensaje")
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
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
        return interaction.reply({ content: "Error: canal no encontrado.", flags: 64 });
    }

    // Embed
    if (id.startsWith("scmodal_submit_")) {
        const title = interaction.fields.getTextInputValue("msg_title");
        const content = interaction.fields.getTextInputValue("msg_content");

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(title)
            .setDescription(content)
            .setFooter({ text: `Enviado por ${interaction.user.tag}` })
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        return interaction.reply({
            content: "Mensaje embed enviado.",
            flags: 64
        });
    }

    // Normal
    if (id.startsWith("scnormal_submit_")) {
        const content = interaction.fields.getTextInputValue("msg_content");

        await channel.send(content);

        return interaction.reply({
            content: "Mensaje enviado.",
            flags: 64
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
        console.log("[sendCenter] Cargado.");
    },

    start,
    handleButton,
    handleModal
};
