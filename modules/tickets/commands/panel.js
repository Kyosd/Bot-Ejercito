// modules/tickets/commands/panel.js
"use strict";

const {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const coreConfig = require("../../../core/config");
const panelManager = require("../panelManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("panel")
        .setDescription("Gestión y administración integral de paneles de atención institucional (Alto Mando)")
        // ==========================================
        // SUBCOMANDOS DE PANELES
        // ==========================================
        .addSubcommand(sub =>
            sub.setName("crear")
                .setDescription("Crea un nuevo panel de atención institucional")
                .addStringOption(opt =>
                    opt.setName("nombre")
                        .setDescription("Nombre del panel (Ej: Divisiones, Cursos, Incorporación)")
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("descripcion")
                        .setDescription("Descripción administrativa del panel")
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName("categoria_por_defecto")
                        .setDescription("Categoría donde se crearán los tickets si la opción no tiene una propia")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName("editar")
                .setDescription("Modifica el nombre o descripción de un panel")
                .addStringOption(opt =>
                    opt.setName("panel")
                        .setDescription("Nombre o identificador del panel")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(opt =>
                    opt.setName("nuevo_nombre")
                        .setDescription("Nuevo nombre para el panel")
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName("nueva_descripcion")
                        .setDescription("Nueva descripción administrativa")
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName("eliminar")
                .setDescription("Elimina un panel y todas sus opciones asociadas")
                .addStringOption(opt =>
                    opt.setName("panel")
                        .setDescription("Nombre o identificador del panel a eliminar")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("publicar")
                .setDescription("Publica o actualiza el panel con su menú desplegable en un canal")
                .addStringOption(opt =>
                    opt.setName("panel")
                        .setDescription("Nombre o identificador del panel a publicar")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(opt =>
                    opt.setName("canal")
                        .setDescription("Canal de texto donde se publicará el panel")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("listar")
                .setDescription("Muestra todos los paneles de atención registrados en la base de datos")
        )
        .addSubcommand(sub =>
            sub.setName("ver")
                .setDescription("Consulta la configuración completa y opciones de un panel")
                .addStringOption(opt =>
                    opt.setName("panel")
                        .setDescription("Nombre o identificador del panel")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("estado")
                .setDescription("Activa o desactiva un panel de atención")
                .addStringOption(opt =>
                    opt.setName("panel")
                        .setDescription("Nombre o identificador del panel")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(opt =>
                    opt.setName("estado")
                        .setDescription("Estado del panel")
                        .setRequired(true)
                        .addChoices(
                            { name: "Activo (Operativo)", value: "ACTIVE" },
                            { name: "Inactivo (Cerrado temporalmente)", value: "INACTIVE" }
                        )
                )
        )

        // ==========================================
        // SUBCOMANDO GROUP: OPCIONES
        // ==========================================
        .addSubcommandGroup(group =>
            group.setName("opcion")
                .setDescription("Gestión de opciones (divisiones, cursos, etc.) dentro de un panel")
                .addSubcommand(sub =>
                    sub.setName("agregar")
                        .setDescription("Agrega una nueva opción a un panel")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel al que pertenecerá la opción")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("nombre")
                                .setDescription("Nombre de la opción (Ej: CITEC, GAULA, Lancero)")
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Descripción breve que aparecerá en el menú desplegable")
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("emoji")
                                .setDescription("Emoji que identificará a la opción (Ej: 🎖️, 🛡️, ✈️)")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("prefijo")
                                .setDescription("Prefijo para el canal de ticket (Ej: citec-, gaula-)")
                                .setRequired(false)
                        )
                        .addRoleOption(opt =>
                            opt.setName("rol_encargado")
                                .setDescription("Rol militar encargado de atender esta opción específica")
                                .setRequired(false)
                        )
                        .addChannelOption(opt =>
                            opt.setName("categoria")
                                .setDescription("Categoría donde se crearán los tickets de esta opción")
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(false)
                        )
                        .addIntegerOption(opt =>
                            opt.setName("limite_tickets")
                                .setDescription("Límite de tickets abiertos por usuario (Por defecto: 1)")
                                .setMinValue(1)
                                .setMaxValue(10)
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("editar")
                        .setDescription("Edita una opción existente de un panel")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel al que pertenece")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Nombre de la opción a editar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("nuevo_nombre")
                                .setDescription("Nuevo nombre para la opción")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("nueva_descripcion")
                                .setDescription("Nueva descripción")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("nuevo_emoji")
                                .setDescription("Nuevo emoji")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("nuevo_prefijo")
                                .setDescription("Nuevo prefijo de canal")
                                .setRequired(false)
                        )
                        .addIntegerOption(opt =>
                            opt.setName("limite_tickets")
                                .setDescription("Nuevo límite de tickets abiertos")
                                .setMinValue(1)
                                .setMaxValue(10)
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("eliminar")
                        .setDescription("Elimina una opción de un panel")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel al que pertenece")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción a eliminar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("listar")
                        .setDescription("Lista todas las opciones configuradas en un panel")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel a consultar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        )

        // ==========================================
        // SUBCOMANDO GROUP: FORMULARIOS
        // ==========================================
        .addSubcommandGroup(group =>
            group.setName("formulario")
                .setDescription("Configuración de formularios personalizados por opción")
                .addSubcommand(sub =>
                    sub.setName("agregar")
                        .setDescription("Agrega un campo de pregunta al formulario de una opción")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel al que pertenece la opción")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción a la que se le añadirá el campo")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("etiqueta")
                                .setDescription("Pregunta o etiqueta del campo (Ej: Nombre IC, Edad, Motivo)")
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("tipo")
                                .setDescription("Tipo de campo")
                                .setRequired(true)
                                .addChoices(
                                    { name: "Texto Corto (1 línea)", value: "SHORT" },
                                    { name: "Texto Largo / Párrafo", value: "PARAGRAPH" }
                                )
                        )
                        .addStringOption(opt =>
                            opt.setName("placeholder")
                                .setDescription("Texto de sugerencia / ejemplo dentro del campo")
                                .setRequired(false)
                        )
                        .addBooleanOption(opt =>
                            opt.setName("obligatorio")
                                .setDescription("¿El usuario debe responderlo obligatoriamente?")
                                .setRequired(false)
                        )
                        .addIntegerOption(opt =>
                            opt.setName("longitud_maxima")
                                .setDescription("Longitud máxima de caracteres (Máx 4000)")
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("eliminar")
                        .setDescription("Elimina un campo del formulario de una opción")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("campo")
                                .setDescription("Etiqueta o ID del campo a eliminar")
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("listar")
                        .setDescription("Muestra los campos del formulario configurados para una opción")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción a consultar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("configurar")
                        .setDescription("Configura el título general del formulario modal")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("titulo")
                                .setDescription("Título que aparecerá en el formulario emergente (Máx 45 car.)")
                                .setRequired(true)
                        )
                )
        )

        // ==========================================
        // SUBCOMANDO GROUP: CONFIGURAR
        // ==========================================
        .addSubcommandGroup(group =>
            group.setName("configurar")
                .setDescription("Configuraciones de roles, categorías, mensajes y aspecto visual")
                .addSubcommand(sub =>
                    sub.setName("roles")
                        .setDescription("Configura el rol encargado para una opción específica o para todo el panel")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel a configurar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addRoleOption(opt =>
                            opt.setName("rol")
                                .setDescription("Rol militar que atenderá las solicitudes")
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción específica (si se omite, se configura como rol general del panel)")
                                .setRequired(false)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("categoria")
                        .setDescription("Configura la categoría de Discord para un panel o una opción")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel a configurar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addChannelOption(opt =>
                            opt.setName("categoria")
                                .setDescription("Categoría donde se crearán los tickets")
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción específica (si se omite, aplica como categoría por defecto del panel)")
                                .setRequired(false)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("mensaje")
                        .setDescription("Personaliza el mensaje inicial de bienvenida del ticket")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("opcion")
                                .setDescription("Opción a la que pertenecerá el mensaje")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("texto")
                                .setDescription("Texto inicial del ticket. Variables: {user}, {option}, {panel}, {ticket}")
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("imagen")
                        .setDescription("Personaliza el aspecto visual del panel (Colores, Banner, Miniatura)")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("Panel a configurar")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(opt =>
                            opt.setName("titulo_embed")
                                .setDescription("Título visual del embed institucional")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("descripcion_embed")
                                .setDescription("Descripción visual del embed")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("color_hex")
                                .setDescription("Color hexadecimal (Ej: #2d5a27, #d4af37, #8b1e1e)")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("banner_url")
                                .setDescription("URL directa de la imagen / banner (https://...)")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("thumbnail_url")
                                .setDescription("URL directa de la miniatura / escudo (https://...)")
                                .setRequired(false)
                        )
                        .addStringOption(opt =>
                            opt.setName("footer_texto")
                                .setDescription("Texto al pie del embed")
                                .setRequired(false)
                        )
                )
        ),

    // ============================================================
    // AUTOCOMPLETE HANDLER
    // ============================================================
    async autocomplete(bot, interaction) {
        const focused = interaction.options.getFocused(true);
        const panels = await panelManager.getAllPanels(bot);

        if (focused.name === "panel") {
            const query = (focused.value || "").toLowerCase();
            const filtered = panels
                .filter(p => p.name.toLowerCase().includes(query) || p.custom_id.toLowerCase().includes(query))
                .slice(0, 25)
                .map(p => ({
                    name: `${p.name} (${p.status === "ACTIVE" ? "<a:online:1565448013218848949> Activo" : "<a:offline:1567957044928192673> Inactivo"})`.slice(0, 100),
                    value: p.custom_id
                }));
            return interaction.respond(filtered);
        }

        if (focused.name === "opcion") {
            const panelInput = interaction.options.getString("panel");
            if (!panelInput) return interaction.respond([]);

            const panel = await panelManager.getPanelByCustomId(bot, panelInput);
            if (!panel) return interaction.respond([]);

            const options = await panelManager.getOptionsByPanelId(bot, panel.id);
            const query = (focused.value || "").toLowerCase();
            const filtered = options
                .filter(o => o.name.toLowerCase().includes(query) || o.custom_id.toLowerCase().includes(query))
                .slice(0, 25)
                .map(o => ({
                    name: `${o.emoji ? o.emoji + " " : ""}${o.name}`.slice(0, 100),
                    value: o.custom_id
                }));
            return interaction.respond(filtered);
        }

        return interaction.respond([]);
    },

    // ============================================================
    // EXECUTE
    // ============================================================
    async execute(bot, interaction) {
        if (!coreConfig.isGeneral(interaction.member)) {
            return interaction.reply({
                content: "<a:warning:1565451290367107092> Solo el Alto Mando tiene autorización para administrar los paneles de atención.",
                ephemeral: true
            });
        }

        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();

        // ------------------------------------------------------------
        // 1. SUBCOMANDOS DE PANELES
        // ------------------------------------------------------------
        if (!group) {
            // /panel crear
            if (sub === "crear") {
                const nombre = interaction.options.getString("nombre").trim();
                const descripcion = interaction.options.getString("descripcion") || "";
                const categoria = interaction.options.getChannel("categoria_por_defecto");

                const existing = await panelManager.getPanelByCustomId(bot, nombre);
                if (existing) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> Ya existe un panel con el nombre o identificador **${nombre}**. Elige un nombre diferente.`,
                        ephemeral: true
                    });
                }

                const created = await panelManager.createPanel(bot, {
                    name: nombre,
                    description: descripcion,
                    default_category_id: categoria ? categoria.id : null,
                    created_by: interaction.user.id
                });

                const embed = new EmbedBuilder()
                    .setColor(coreConfig.colors?.success || "#4b8b3b")
                    .setTitle("<a:check:1563959567191244892> Panel de Atención Creado Exitosamente")
                    .setDescription(
                        `• **Identificador:** \`${created.custom_id}\`\n` +
                        `• **Nombre:** **${created.name}**\n` +
                        `• **Descripción:** ${created.description || "*Sin descripción*"}\n` +
                        `• **Categoría por defecto:** ${categoria ? `<#${categoria.id}>` : "*Ninguna*"}\n` +
                        `• **Estado:** <a:online:1565448013218848949> Activo\n\n` +
                        `<a:alert:1565453809038262432> **Siguientes pasos recomendados:**\n` +
                        `1. Agrega opciones con \`/panel opcion agregar panel:${created.custom_id} ...\`\n` +
                        `2. Configura aspecto o roles si lo requieres.\n` +
                        `3. Publica el panel con \`/panel publicar panel:${created.custom_id} canal:#canal\`.`
                    )
                    .setFooter({ text: "Comando Central • Gestión de Tickets" })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // /panel editar
            if (sub === "editar") {
                const panelInput = interaction.options.getString("panel");
                const nuevoNombre = interaction.options.getString("nuevo_nombre");
                const nuevaDesc = interaction.options.getString("nueva_descripcion");

                const panel = await panelManager.getPanelByCustomId(bot, panelInput);
                if (!panel) {
                    return interaction.reply({ content: `❌ No se encontró el panel **${panelInput}**.`, ephemeral: true });
                }

                const updates = {};
                if (nuevoNombre) updates.name = nuevoNombre.trim();
                if (nuevaDesc !== null && nuevaDesc !== undefined) updates.description = nuevaDesc.trim();

                if (Object.keys(updates).length === 0) {
                    return interaction.reply({ content: "<a:alert:1565453809038262432> No especificaste ningún campo para editar.", ephemeral: true });
                }

                const updated = await panelManager.updatePanel(bot, panel.id, updates);

                // Si está publicado, actualizar automáticamente el mensaje en Discord
                if (updated.channel_id && updated.message_id) {
                    try {
                        const channel = await interaction.guild.channels.fetch(updated.channel_id).catch(() => null);
                        if (channel) {
                            await panelManager.publishPanel(bot, updated.id, channel);
                        }
                    } catch (_) {}
                }

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Panel **${updated.name}** actualizado correctamente.`,
                    ephemeral: true
                });
            }

            // /panel eliminar
            if (sub === "eliminar") {
                const panelInput = interaction.options.getString("panel");
                const panel = await panelManager.getPanelByCustomId(bot, panelInput);
                if (!panel) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
                }

                const activeTickets = await panelManager.getActiveTicketsCountForPanel(bot, panel.id);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`PANEL_CONFIRM_DEL_${panel.id}`)
                        .setLabel("Confirmar Eliminación")
                        .setEmoji("<:trash:1568362197455737003>")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("PANEL_CANCEL_DEL")
                        .setLabel("Cancelar")
                        .setStyle(ButtonStyle.Secondary)
                );

                let warnText = `<a:warning:1565451290367107092> ¿Estás completamente seguro de eliminar el panel **${panel.name}**?\n` +
                    `Se eliminarán todas sus opciones y formularios configurados en la base de datos.`;

                if (activeTickets > 0) {
                    warnText += `\n\n<a:warning:1565451290367107092> **ADVERTENCIA:** Este panel tiene actualmente **${activeTickets} ticket(s) activo(s)**. Los canales de ticket existentes NO se cerrarán, pero quedarán desvinculados de este panel.`;
                }

                return interaction.reply({
                    content: warnText,
                    components: [row],
                    ephemeral: true
                });
            }

            // /panel publicar
            if (sub === "publicar") {
                const panelInput = interaction.options.getString("panel");
                const channel = interaction.options.getChannel("canal");

                const panel = await panelManager.getPanelByCustomId(bot, panelInput);
                if (!panel) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
                }

                const options = await panelManager.getOptionsByPanelId(bot, panel.id);
                if (options.length === 0) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> El panel **${panel.name}** no tiene opciones configuradas aún. Añade al menos una opción antes de publicarlo (\`/panel opcion agregar\`).`,
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const sent = await panelManager.publishPanel(bot, panel.id, channel);
                    return interaction.editReply({
                        content: `<a:check:1563959567191244892> **Panel publicado con éxito en** <#${channel.id}>.\nIdentificador del mensaje: \`${sent.id}\`. Los usuarios ya pueden usar el menú desplegable para abrir tickets.`
                    });
                } catch (err) {
                    return interaction.editReply({
                        content: `<:forbidden:1568246186702274733> Error al publicar el panel en <#${channel.id}>: ${err.message}`
                    });
                }
            }

            // /panel listar
            if (sub === "listar") {
                const panels = await panelManager.getAllPanels(bot);
                if (panels.length === 0) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> Actualmente no hay paneles de atención creados. Usa \`/panel crear\` para empezar.`,
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(coreConfig.colors?.militaryGold || "#d4af37")
                    .setTitle("<a: Paneles de Atención Institucional Registrados")
                    .setDescription(
                        panels.map(p => {
                            const status = p.status === "ACTIVE" ? "<a:online:1565448013218848949> Activo" : "<a:offline:1567957044928192673> Inactivo";
                            const pub = p.channel_id ? `<#${p.channel_id}>` : "*Sin publicar*";
                            return `• **${p.name}** (\`${p.custom_id}\`)\n   └ Estado: ${status} | Publicado: ${pub} | ID: \`${p.id}\``;
                        }).join("\n\n")
                    )
                    .setFooter({ text: "Comando Central • Gestión Institucional de Tickets" })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // /panel ver
            if (sub === "ver") {
                const panelInput = interaction.options.getString("panel");
                const panel = await panelManager.getPanelByCustomId(bot, panelInput);
                if (!panel) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
                }

                const options = await panelManager.getOptionsByPanelId(bot, panel.id);
                const activeTickets = await panelManager.getActiveTicketsCountForPanel(bot, panel.id);

                let defaultRolesText = "*Ninguno*";
                try {
                    const parsed = JSON.parse(panel.default_roles || "[]");
                    if (parsed.length > 0) defaultRolesText = parsed.map(r => `<@&${r}>`).join(", ");
                } catch (_) {}

                const embed = new EmbedBuilder()
                    .setColor(panel.embed_color || coreConfig.colors?.militaryGold || "#d4af37")
                    .setTitle(`<:stars:1568242028213706752> Detalles del Panel: ${panel.name}`)
                    .setDescription(panel.description || "*Sin descripción administrativa*")
                    .addFields(
                        { name: "Identificador", value: `\`${panel.custom_id}\``, inline: true },
                        { name: "Estado", value: panel.status === "ACTIVE" ? "<a:online:1565448013218848949> Activo" : "<a:offline:1567957044928192673> Inactivo", inline: true },
                        { name: "Tickets Abiertos", value: `\`${activeTickets}\``, inline: true },
                        { name: "Canal Publicado", value: panel.channel_id ? `<#${panel.channel_id}>` : "*No publicado*", inline: true },
                        { name: "Categoría por Defecto", value: panel.default_category_id ? `<#${panel.default_category_id}>` : "*Ninguna*", inline: true },
                        { name: "Roles por Defecto", value: defaultRolesText, inline: true },
                        {
                            name: `<:ticket:1565472130030772276> Opciones Disponibles (${options.length})`,
                            value: options.length > 0
                                ? options.map(o => `• ${o.emoji || "🎫"} **${o.name}** (\`${o.custom_id}\`) — *${o.description || "Sin descripción"}*`).join("\n")
                                : "*Sin opciones agregadas aún. Usa `/panel opcion agregar`.*",
                            inline: false
                        }
                    )
                    .setFooter({ text: `ID en BD: ${panel.id} • Creado: ${new Date(Number(panel.created_at)).toLocaleDateString("es-ES")}` })
                    .setTimestamp();

                if (panel.embed_thumbnail) embed.setThumbnail(panel.embed_thumbnail);
                if (panel.embed_image) embed.setImage(panel.embed_image);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // /panel estado
            if (sub === "estado") {
                const panelInput = interaction.options.getString("panel");
                const nuevoEstado = interaction.options.getString("estado");

                const panel = await panelManager.getPanelByCustomId(bot, panelInput);
                if (!panel) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
                }

                await panelManager.updatePanel(bot, panel.id, { status: nuevoEstado });

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Estado del panel **${panel.name}** actualizado a: **${nuevoEstado === "ACTIVE" ? "<a:online:1565448013218848949> Activo" : "<a:offline:1567957044928192673> Inactivo"}**.`,
                    ephemeral: true
                });
            }
        }

        // ------------------------------------------------------------
        // 2. SUBCOMANDOS DE OPCIONES (/panel opcion ...)
        // ------------------------------------------------------------
        if (group === "opcion") {
            const panelInput = interaction.options.getString("panel");
            const panel = await panelManager.getPanelByCustomId(bot, panelInput);
            if (!panel) {
                return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
            }

            // /panel opcion agregar
            if (sub === "agregar") {
                const nombre = interaction.options.getString("nombre").trim();
                const descripcion = interaction.options.getString("descripcion").trim();
                const emoji = interaction.options.getString("emoji") || "🎫";
                const prefijo = interaction.options.getString("prefijo") || `${nombre.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}-`;
                const rol = interaction.options.getRole("rol_encargado");
                const categoria = interaction.options.getChannel("categoria");
                const limite = interaction.options.getInteger("limite_tickets") || 1;

                const existing = await panelManager.getOptionByCustomId(bot, panel.id, nombre);
                if (existing) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> Ya existe una opción llamada **${nombre}** dentro del panel **${panel.name}**.`,
                        ephemeral: true
                    });
                }

                const created = await panelManager.addOption(bot, panel.id, {
                    name: nombre,
                    description: descripcion,
                    emoji: emoji,
                    prefix: prefijo,
                    discord_category_id: categoria ? categoria.id : null,
                    roles: rol ? [rol.id] : [],
                    ticket_limit: limite
                });

                // Si el panel ya está publicado, refrescar el menú desplegable en Discord
                if (panel.channel_id && panel.message_id) {
                    try {
                        const channel = await interaction.guild.channels.fetch(panel.channel_id).catch(() => null);
                        if (channel) await panelManager.publishPanel(bot, panel.id, channel);
                    } catch (_) {}
                }

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Opción **${created.emoji} ${created.name}** añadida exitosamente al panel **${panel.name}**.\n` +
                        `• **Prefijo de canal:** \`${created.prefix}\`\n` +
                        `• **Rol encargado:** ${rol ? `<@&${rol.id}>` : "*Heredado del panel o Mando General*"}\n` +
                        `• **Categoría:** ${categoria ? `<#${categoria.id}>` : (panel.default_category_id ? `<#${panel.default_category_id}> (por defecto del panel)` : "*Sin categoría asignada*")}\n` +
                        `• **Límite de tickets por usuario:** \`${limite}\``,
                    ephemeral: true
                });
            }

            // /panel opcion editar
            if (sub === "editar") {
                const opcionInput = interaction.options.getString("opcion");
                const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
                if (!option) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
                }

                const nuevoNombre = interaction.options.getString("nuevo_nombre");
                const nuevaDesc = interaction.options.getString("nueva_descripcion");
                const nuevoEmoji = interaction.options.getString("nuevo_emoji");
                const nuevoPrefijo = interaction.options.getString("nuevo_prefijo");
                const limite = interaction.options.getInteger("limite_tickets");

                const updates = {};
                if (nuevoNombre) updates.name = nuevoNombre.trim();
                if (nuevaDesc !== null && nuevaDesc !== undefined) updates.description = nuevaDesc.trim();
                if (nuevoEmoji) updates.emoji = nuevoEmoji.trim();
                if (nuevoPrefijo) updates.prefix = nuevoPrefijo.trim();
                if (limite !== null && limite !== undefined) updates.ticket_limit = limite;

                if (Object.keys(updates).length === 0) {
                    return interaction.reply({ content: `<a:alert:1565453809038262432> No especificaste ningún cambio.`, ephemeral: true });
                }

                const updated = await panelManager.updateOption(bot, option.id, updates);

                // Refrescar panel publicado
                if (panel.channel_id && panel.message_id) {
                    try {
                        const channel = await interaction.guild.channels.fetch(panel.channel_id).catch(() => null);
                        if (channel) await panelManager.publishPanel(bot, panel.id, channel);
                    } catch (_) {}
                }

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Opción **${updated.name}** actualizada correctamente.`,
                    ephemeral: true
                });
            }

            // /panel opcion eliminar
            if (sub === "eliminar") {
                const opcionInput = interaction.options.getString("opcion");
                const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
                if (!option) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
                }

                await panelManager.deleteOption(bot, option.id);

                // Refrescar panel publicado
                if (panel.channel_id && panel.message_id) {
                    try {
                        const channel = await interaction.guild.channels.fetch(panel.channel_id).catch(() => null);
                        if (channel) await panelManager.publishPanel(bot, panel.id, channel);
                    } catch (_) {}
                }

                return interaction.reply({
                    content: `<:trash:1568246186702274733> Opción **${option.name}** eliminada del panel **${panel.name}**. Los tickets que ya estaban abiertos conservarán su registro.`,
                    ephemeral: true
                });
            }

            // /panel opcion listar
            if (sub === "listar") {
                const options = await panelManager.getOptionsByPanelId(bot, panel.id);
                if (options.length === 0) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> El panel **${panel.name}** no tiene ninguna opción agregada. Usa \`/panel opcion agregar\`.`,
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(coreConfig.colors?.militaryGold || "#d4af37")
                    .setTitle(`<a:write:1563959662003622014> Opciones del Panel: ${panel.name}`)
                    .setDescription(
                        options.map((o, i) => {
                            let rolesText = "*Heredados del panel*";
                            try {
                                const parsed = JSON.parse(o.roles || "[]");
                                if (parsed.length > 0) rolesText = parsed.map(r => `<@&${r}>`).join(", ");
                            } catch (_) {}

                            return `**${i + 1}.** ${o.emoji || "<:tickets:1567998576641056900>"} **${o.name}** (\`${o.custom_id}\`)\n` +
                                `   └ *Descripción:* ${o.description || "N/A"}\n` +
                                `   └ *Prefijo:* \`${o.prefix}\` | *Límite:* \`${o.ticket_limit}\` ticket(s)\n` +
                                `   └ *Categoría:* ${o.discord_category_id ? `<#${o.discord_category_id}>` : (panel.default_category_id ? `<#${panel.default_category_id}> (panel)` : "*Por defecto*")}\n` +
                                `   └ *Roles:* ${rolesText}`;
                        }).join("\n\n")
                    )
                    .setFooter({ text: "Comando Central • Gestión Institucional de Tickets" })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // ------------------------------------------------------------
        // 3. SUBCOMANDOS DE FORMULARIOS (/panel formulario ...)
        // ------------------------------------------------------------
        if (group === "formulario") {
            const panelInput = interaction.options.getString("panel");
            const panel = await panelManager.getPanelByCustomId(bot, panelInput);
            if (!panel) {
                return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
            }

            const opcionInput = interaction.options.getString("opcion");
            const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
            if (!option) {
                return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
            }

            // /panel formulario agregar
            if (sub === "agregar") {
                const etiqueta = interaction.options.getString("etiqueta").trim();
                const tipo = interaction.options.getString("tipo");
                const placeholder = interaction.options.getString("placeholder") || "";
                const obligatorio = interaction.options.getBoolean("obligatorio") !== false;
                const maxLen = interaction.options.getInteger("longitud_maxima") || (tipo === "SHORT" ? 150 : 2000);

                const form = await panelManager.getOrCreateForm(bot, option.id, `Formulario de ${option.name}`);
                const currentFields = await panelManager.getFieldsByFormId(bot, form.id);

                if (currentFields.length >= 5) {
                    return interaction.reply({
                        content: "<:warning:1565451290367107092> Discord permite un máximo de **5 campos por modal**. Si necesitas más preguntas, puedes editar los campos existentes o solicitar más información en el mensaje inicial del ticket.",
                        ephemeral: true
                    });
                }

                const field = await panelManager.addFormField(bot, form.id, {
                    label: etiqueta,
                    field_type: tipo,
                    placeholder: placeholder,
                    required: obligatorio,
                    max_length: maxLen,
                    field_order: currentFields.length + 1
                });

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Campo **"${field.label}"** (\`${tipo}\`) añadido exitosamente al formulario de la opción **${option.name}**. (${currentFields.length + 1}/5 campos).`,
                    ephemeral: true
                });
            }

            // /panel formulario eliminar
            if (sub === "eliminar") {
                const campoInput = interaction.options.getString("campo").trim();
                const form = await panelManager.getFormByOptionId(bot, option.id);
                if (!form) {
                    return interaction.reply({ content: `<a:alert:1565453809038262432> La opción **${option.name}** no tiene formulario configurado.`, ephemeral: true });
                }

                const fields = await panelManager.getFieldsByFormId(bot, form.id);
                const targetField = fields.find(f => f.label.toLowerCase() === campoInput.toLowerCase() || f.custom_id.toLowerCase() === campoInput.toLowerCase() || String(f.id) === campoInput);

                if (!targetField) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró ningún campo llamado **"${campoInput}"** en este formulario.`, ephemeral: true });
                }

                await panelManager.deleteFormField(bot, targetField.id);

                return interaction.reply({
                    content: `<:trash:1568362197455737003> Campo **"${targetField.label}"** eliminado del formulario de **${option.name}**.`,
                    ephemeral: true
                });
            }

            // /panel formulario listar
            if (sub === "listar") {
                const form = await panelManager.getFormByOptionId(bot, option.id);
                if (!form) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> La opción **${option.name}** no tiene ningún formulario configurado. Los tickets de esta opción se crearán directamente sin preguntas previas.`,
                        ephemeral: true
                    });
                }

                const fields = await panelManager.getFieldsByFormId(bot, form.id);
                if (fields.length === 0) {
                    return interaction.reply({
                        content: `<a:alert:1565453809038262432> El formulario de **${option.name}** existe pero no tiene campos añadidos. Usa \`/panel formulario agregar\`.`,
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(coreConfig.colors?.militaryGold || "#d4af37")
                    .setTitle(`<a:write:1563959662003622014> Formulario de: ${option.name}`)
                    .setDescription(`Título del Modal: **${form.title}**\n\n**Campos configurados:**\n` +
                        fields.map((f, i) =>
                            `**${i + 1}.** \`${f.field_type}\` **${f.label}** ${f.required ? "*(Obligatorio)*" : "*(Opcional)*"}\n` +
                            `   └ Placeholder: *"${f.placeholder || "Sin ejemplo"}"* | ID: \`${f.custom_id}\``
                        ).join("\n\n")
                    )
                    .setFooter({ text: "Comando Central • Gestión Institucional de Formularios" })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // /panel formulario configurar
            if (sub === "configurar") {
                const titulo = interaction.options.getString("titulo").trim().slice(0, 45);
                const form = await panelManager.getOrCreateForm(bot, option.id, titulo);

                await bot.db.run("UPDATE ticket_forms SET title = ?, updated_at = ? WHERE id = ?", [titulo, Date.now(), form.id]);

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Título del formulario para **${option.name}** actualizado a: **"${titulo}"**.`,
                    ephemeral: true
                });
            }
        }

        // ------------------------------------------------------------
        // 4. SUBCOMANDOS DE CONFIGURACIÓN (/panel configurar ...)
        // ------------------------------------------------------------
        if (group === "configurar") {
            const panelInput = interaction.options.getString("panel");
            const panel = await panelManager.getPanelByCustomId(bot, panelInput);
            if (!panel) {
                return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró el panel **${panelInput}**.`, ephemeral: true });
            }

            // /panel configurar roles
            if (sub === "roles") {
                const rol = interaction.options.getRole("rol");
                const opcionInput = interaction.options.getString("opcion");

                if (opcionInput) {
                    const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
                    if (!option) {
                        return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
                    }

                    await panelManager.updateOption(bot, option.id, { roles: JSON.stringify([rol.id]) });

                    return interaction.reply({
                        content: `<a:check:1563959567191244892> Rol de atención para la opción **${option.name}** establecido a: <@&${rol.id}>. Solo este equipo y el Alto Mando verán sus tickets.`,
                        ephemeral: true
                    });
                } else {
                    await panelManager.updatePanel(bot, panel.id, { default_roles: JSON.stringify([rol.id]) });

                    return interaction.reply({
                        content: `<a:check:1563959567191244892> Rol general predeterminado para el panel **${panel.name}** establecido a: <@&${rol.id}>.`,
                        ephemeral: true
                    });
                }
            }

            // /panel configurar categoria
            if (sub === "categoria") {
                const categoria = interaction.options.getChannel("categoria");
                const opcionInput = interaction.options.getString("opcion");

                if (opcionInput) {
                    const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
                    if (!option) {
                        return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
                    }

                    await panelManager.updateOption(bot, option.id, { discord_category_id: categoria.id });

                    return interaction.reply({
                        content: `<a:check:1563959567191244892> Categoría de Discord para los tickets de **${option.name}** configurada a: <#${categoria.id}>.`,
                        ephemeral: true
                    });
                } else {
                    await panelManager.updatePanel(bot, panel.id, { default_category_id: categoria.id });

                    return interaction.reply({
                        content: `<a:check:1563959567191244892> Categoría de Discord por defecto para el panel **${panel.name}** configurada a: <#${categoria.id}>.`,
                        ephemeral: true
                    });
                }
            }

            // /panel configurar mensaje
            if (sub === "mensaje") {
                const opcionInput = interaction.options.getString("opcion");
                const texto = interaction.options.getString("texto");

                const option = await panelManager.getOptionByCustomId(bot, panel.id, opcionInput);
                if (!option) {
                    return interaction.reply({ content: `<:forbidden:1568246186702274733> No se encontró la opción **${opcionInput}** en el panel **${panel.name}**.`, ephemeral: true });
                }

                await panelManager.updateOption(bot, option.id, { welcome_message: texto });

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Mensaje de bienvenida para los tickets de **${option.name}** actualizado exitosamente.\n\n*Vista previa:* \n${texto}`,
                    ephemeral: true
                });
            }

            // /panel configurar imagen
            if (sub === "imagen") {
                const tituloEmbed = interaction.options.getString("titulo_embed");
                const descEmbed = interaction.options.getString("descripcion_embed");
                const colorHex = interaction.options.getString("color_hex");
                const bannerUrl = interaction.options.getString("banner_url");
                const thumbUrl = interaction.options.getString("thumbnail_url");
                const footerText = interaction.options.getString("footer_texto");

                const updates = {};
                if (tituloEmbed) updates.embed_title = tituloEmbed.trim();
                if (descEmbed) updates.embed_description = descEmbed.trim();
                if (colorHex) updates.embed_color = colorHex.trim();
                if (bannerUrl !== null && bannerUrl !== undefined) updates.embed_image = bannerUrl.trim() || null;
                if (thumbUrl !== null && thumbUrl !== undefined) updates.embed_thumbnail = thumbUrl.trim() || null;
                if (footerText) updates.embed_footer = footerText.trim();

                if (Object.keys(updates).length === 0) {
                    return interaction.reply({ content: `<:warning:1565451290367107092> No especificaste ningún cambio visual.`, ephemeral: true });
                }

                const updated = await panelManager.updatePanel(bot, panel.id, updates);

                // Refrescar automáticamente si ya está publicado
                if (updated.channel_id && updated.message_id) {
                    try {
                        const channel = await interaction.guild.channels.fetch(updated.channel_id).catch(() => null);
                        if (channel) await panelManager.publishPanel(bot, updated.id, channel);
                    } catch (_) {}
                }

                return interaction.reply({
                    content: `<a:check:1563959567191244892> Aspecto visual del panel **${updated.name}** actualizado exitosamente. Si ya estaba publicado, se actualizó en vivo en Discord.`,
                    ephemeral: true
                });
            }
        }
    }
};
