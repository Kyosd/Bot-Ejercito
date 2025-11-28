const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const config = require("../../core/config");
const service = require("./service");
const admin = require("./admin");

module.exports = {

    // Mensaje público con botones
    async deploy(bot) {
        const guild = await bot.client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) {
            console.log("Guild no encontrada. Revisa GUILD_ID en .env");
            return;
        }

        const channelId = config.channels.hoursPrincipal;
        if (!channelId) {
            console.log("CHANNEL_HOURS_PRINCIPAL no está definido en .env");
            return;
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.log("Canal principal de horas no encontrado por ID.");
            return;
        }

        
        try {
            const msgs = await channel.messages.fetch({ limit: 10 });
            const own = msgs.filter(m => m.author.id === bot.client.user.id);
            if (own.size > 0) await channel.bulkDelete(own, true);
        } catch (e) {
            console.log("No se pudieron borrar mensajes antiguos (no es crítico).");
        }

        const embed = new EmbedBuilder()
            .setColor(config.style.color)
            .setTitle(`📋 Control de Servicio — ${config.style.systemName}`)
            .setDescription(
                "Sistema oficial para registrar las horas de servicio de los soldados.\n\n" +
                "🔹 **Entrar en servicio**: Inicia tu turno táctico.\n" +
                "🔹 **Salir de servicio**: Finaliza tu turno y registra tus horas.\n" +
                "🔹 **Panel de Generales**: Acceso restringido a mandos autorizados.\n\n" +
                "Cumple con tu deber marcando siempre entrada y salida."
            )
            .setFooter({ text: config.style.footer });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("HOURS_SERVICE_IN")
                .setLabel("Entrar en servicio")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("HOURS_SERVICE_OUT")
                .setLabel("Salir de servicio")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("HOURS_GENERAL_PANEL")
                .setLabel("Panel de Generales")
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });
        console.log("UI de horas desplegada en el canal principal.");
    },

    // Router de botones
    async route(bot, interaction) {
        const id = interaction.customId;

        if (id === "HOURS_SERVICE_IN") {
            return service.startService(bot, interaction);
        }

        if (id === "HOURS_SERVICE_OUT") {
            return service.endService(bot, interaction);
        }

        if (id === "HOURS_GENERAL_PANEL") {
            return admin.openPanel(bot, interaction);
        }

        // Botones internos del panel de generales
        if (id.startsWith("HOURS_GENERAL_")) {
            return admin.handleButton(bot, interaction);
        }
    },

    // Utilidad para crear modals simples desde admin
    createUserModal(customId, title, requireMinutes = false) {
        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle(title);

        const userInput = new TextInputBuilder()
            .setCustomId("TARGET_USER_ID")
            .setLabel("ID del usuario")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);

        modal.addComponents(row1);

        if (requireMinutes) {
            const minutesInput = new TextInputBuilder()
                .setCustomId("TARGET_MINUTES")
                .setLabel("Cantidad de minutos")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row2 = new ActionRowBuilder().addComponents(minutesInput);
            modal.addComponents(row2);
        }

        return modal;
    }
};
