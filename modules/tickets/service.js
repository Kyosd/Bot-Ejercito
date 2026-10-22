// modules/tickets/service.js
"use strict";

const {
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require("discord.js");

const config = require("./config");
const coreConfig = require("../../core/config");

module.exports = {
    // ============================================================
    // GESTOR DINÁMICO DE CATEGORÍAS EN DISCORD
    // Busca la categoría por ID o nombre; si no existe, la crea automáticamente
    // ============================================================
    async getOrCreateCategory(guild, section, bot) {
        let categoryName = section.category_name;
        if (!categoryName) {
            categoryName = `🎫 TICKETS - ${section.name.toUpperCase()}`;
        }

        let category = null;

        // 1. Intentar buscar por ID si ya está guardado
        if (section.discord_category_id) {
            category = guild.channels.cache.get(section.discord_category_id) ||
                await guild.channels.fetch(section.discord_category_id).catch(() => null);

            if (category && category.type !== ChannelType.GuildCategory) {
                category = null;
            }
        }

        // 2. Si no se encontró por ID, buscar por nombre en el servidor (case-insensitive)
        if (!category) {
            const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
            category = channels.find(
                c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
            );
        }

        // 3. Control de límite de 50 canales por categoría de Discord
        if (category && category.children?.cache?.size >= 50) {
            const nextName = `${categoryName} 2`;
            const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
            let overflowCategory = channels.find(
                c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase() === nextName.toLowerCase()
            );

            if (overflowCategory && overflowCategory.children?.cache?.size < 50) {
                category = overflowCategory;
            } else if (!overflowCategory) {
                category = await guild.channels.create({
                    name: nextName,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: bot.client.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.ManageRoles
                            ]
                        }
                    ]
                });
            }
        }

        // 4. Si la categoría no existe en el servidor, ¡crearla automáticamente!
        if (!category) {
            const overwrites = [
                {
                    id: guild.id, // @everyone oculto para privacidad
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: bot.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageRoles
                    ]
                }
            ];

            // Si la sección tiene un rol militar asignado, darle acceso a la categoría
            if (section.role_id && guild.roles.cache.has(section.role_id)) {
                overwrites.push({
                    id: section.role_id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });
            }

            // Roles de generales / alto mando
            for (const rId of (coreConfig.generals || [])) {
                if (guild.roles.cache.has(rId)) {
                    overwrites.push({
                        id: rId,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    });
                }
            }

            category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: overwrites
            });

            console.log(`[tickets] ✅ Categoría de Discord creada automáticamente: "${categoryName}" (${category.id})`);
        }

        // 5. Actualizar discord_category_id en la base de datos para futuras consultas rápidas
        if (category && section.id && section.discord_category_id !== category.id) {
            await bot.db.run(
                "UPDATE ticket_sections SET discord_category_id = ? WHERE id = ?",
                [category.id, section.id]
            ).catch(() => null);
            section.discord_category_id = category.id;
        }

        return category;
    },

    // ============================================================
    // GESTIÓN DE SECCIONES DE TICKETS PERSONALIZADAS (DESDE MODAL)
    // ============================================================
    async handleSectionModalSubmit(bot, interaction, draft) {
        const guild = interaction.guild;
        const panelChannel = guild.channels.cache.get(draft.panelChannelId) ||
            await guild.channels.fetch(draft.panelChannelId).catch(() => null);

        if (!panelChannel || !panelChannel.isTextBased()) {
            return interaction.reply({
                content: "❌ Error: El canal designado para publicar el panel no existe o no es de texto.",
                ephemeral: true
            });
        }

        const title = interaction.fields.getTextInputValue("modal_title");
        const description = interaction.fields.getTextInputValue("modal_desc");
        const imageUrl = interaction.fields.getTextInputValue("modal_image")?.trim() || null;
        const thumbUrl = interaction.fields.getTextInputValue("modal_thumb")?.trim() || null;
        const buttonLabel = interaction.fields.getTextInputValue("modal_button")?.trim() || "Abrir Ticket";

        const db = bot.db;

        // 1. Obtener o crear la categoría de Discord INMEDIATAMENTE para asegurar su ID
        const discordCategory = await this.getOrCreateCategory(guild, draft, bot);

        // 2. Guardar en base de datos la sección
        await db.run(
            `
            INSERT INTO ticket_sections 
            (name, category_name, panel_channel_id, discord_category_id, role_id, button_label, button_emoji, embed_title, embed_description, embed_image, embed_thumbnail, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                draft.name,
                draft.categoryName,
                panelChannel.id,
                discordCategory.id,
                draft.roleId,
                buttonLabel,
                title,
                description,
                imageUrl,
                thumbUrl,
                interaction.user.id,
                Date.now()
            ]
        );

        // Obtener ID de la sección
        const sectionRow = await db.get(
            "SELECT id FROM ticket_sections WHERE panel_channel_id = ? ORDER BY id DESC LIMIT 1",
            [panelChannel.id]
        );
        const sectionId = sectionRow ? sectionRow.id : 1;

        // 2. Construir el Embed Decorado
        const embed = new EmbedBuilder()
            .setColor(coreConfig.colors.militaryGold || "#d4af37")
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `Sección: ${draft.name} • Categoría: ${draft.categoryName}` })
            .setTimestamp();

        if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
            embed.setImage(imageUrl);
        }

        if (thumbUrl && (thumbUrl.startsWith("http://") || thumbUrl.startsWith("https://"))) {
            embed.setThumbnail(thumbUrl);
        }

        // 3. Botón para abrir ticket vinculado a esta sección
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`TICK_OPEN_SEC_${sectionId}`)
                .setLabel(buttonLabel)
                .setEmoji("📩")
                .setStyle(ButtonStyle.Primary)
        );

        // 4. Enviar el panel al canal correspondiente
        const sentMessage = await panelChannel.send({ embeds: [embed], components: [row] });
        await db.run("UPDATE ticket_sections SET panel_message_id = ? WHERE id = ?", [sentMessage.id, sectionId]);

        return interaction.reply({
            content: `✅ **¡Sección de tickets configurada con éxito!**\n\n` +
                `• **Sección:** \`${draft.name}\`\n` +
                `• **Panel Publicado en:** <#${panelChannel.id}>\n` +
                `• **Categoría de Destino:** \`${draft.categoryName}\` *(se buscará o creará automáticamente al abrirse el primer ticket)*\n` +
                `• **Rol Asignado:** ${draft.roleId ? `<@&${draft.roleId}>` : "*General / Mando*"}\n\n` +
                `Los usuarios ya pueden pulsar el botón para abrir tickets organizados.`,
            ephemeral: true
        });
    },

    // ============================================================
    // ABRIR TICKET DESDE BOTÓN DE SECCIÓN PERSONALIZADA
    // ============================================================
    async openSectionTicket(bot, interaction, sectionId) {
        const guild = interaction.guild;
        const user = interaction.user;
        const db = bot.db;

        const section = await db.get("SELECT * FROM ticket_sections WHERE id = ?", [sectionId]);
        if (!section) {
            return interaction.reply({
                content: "❌ Error: La configuración de esta sección de tickets no se encuentra en el sistema.",
                ephemeral: true
            });
        }

        // 1. Anti-spam: Verificar si el usuario ya tiene un ticket abierto en esta sección
        const openTicket = await db.get(
            "SELECT channel_id FROM tickets WHERE user_id = ? AND category = ? AND status = 'OPEN'",
            [user.id, section.name]
        );

        if (openTicket) {
            const existingChannel = guild.channels.cache.get(openTicket.channel_id) ||
                await guild.channels.fetch(openTicket.channel_id).catch(() => null);

            if (existingChannel) {
                return interaction.reply({
                    content: `⛔ Ya tienes un ticket abierto en la sección **${section.name}**: <#${existingChannel.id}>. Por favor resuélvelo antes de abrir otro.`,
                    ephemeral: true
                });
            } else {
                await db.run("UPDATE tickets SET status = 'CLOSED' WHERE channel_id = ?", [openTicket.channel_id]);
            }
        }

        // 2. Obtener o crear automáticamente la categoría en Discord
        const discordCategory = await this.getOrCreateCategory(guild, section, bot);

        // 3. Permisos aislados para el canal del ticket
        const overwrites = [
            {
                id: guild.id, // @everyone oculto
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: bot.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        // Añadir rol específico de la sección si existe
        if (section.role_id && guild.roles.cache.has(section.role_id)) {
            overwrites.push({
                id: section.role_id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            });
        }

        // Añadir roles generales de mando
        for (const roleId of (coreConfig.generals || [])) {
            if (guild.roles.cache.has(roleId)) {
                overwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.EmbedLinks,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });
            }
        }

        // 4. Crear el canal dentro de la categoría específica de Discord
        const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        const cleanSection = section.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
        const channelName = `${cleanSection}-${cleanUsername}`;

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: discordCategory ? discordCategory.id : undefined,
            permissionOverwrites: overwrites,
            topic: `Ticket de ${user.tag} (${user.id}) | Sección: ${section.name}`
        });

        // 5. Registrar ticket en base de datos
        await db.run(
            `
            INSERT INTO tickets (channel_id, user_id, category, status, created_at)
            VALUES (?, ?, ?, 'OPEN', ?)
        `,
            [channel.id, user.id, section.name, Date.now()]
        );

        // 6. Enviar mensaje de bienvenida y controles tácticos
        const welcomeEmbed = new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(section.embed_title)
            .setDescription(
                `Bienvenido <@${user.id}> al departamento oficial de **${section.name}**.\n\n` +
                `Un oficial encargado atenderá tu caso en breve.\n\n` +
                `• **Solicitante:** <@${user.id}> (\`${user.id}\`)\n` +
                `• **Departamento:** \`${section.name}\`\n` +
                `• **Categoría Asignada:** \`${discordCategory.name}\`\n` +
                `• **Fecha de Apertura:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setFooter({ text: "Sistema de Atención Militar • Ejército Nacional" })
            .setTimestamp();

        if (section.embed_thumbnail) {
            welcomeEmbed.setThumbnail(section.embed_thumbnail);
        }

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("TICK_CLOSE")
                .setLabel("Cerrar Ticket")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("TICK_CLAIM")
                .setLabel("Reclamar Atención")
                .setEmoji("👤")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("TICK_TRANSCRIPT")
                .setLabel("Transcripción")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Secondary)
        );

        const mentions = [
            user.toString(),
            section.role_id ? `<@&${section.role_id}>` : ""
        ].filter(Boolean).join(" ");

        await channel.send({ content: mentions, embeds: [welcomeEmbed], components: [actionRow] });

        return interaction.reply({
            content: `✅ **Ticket generado con éxito:** Dirígete a <#${channel.id}> (organizado en la categoría **${discordCategory.name}**).`,
            ephemeral: true
        });
    },

    // ============================================================
    // CREAR TICKET DESDE SELECT MENU GENERAL (LEGACY / MULTI-CAT)
    // ============================================================
    async createTicket(bot, interaction, categoryId) {
        const guild = interaction.guild;
        const user = interaction.user;
        const db = bot.db;

        const openTickets = await db.all(
            "SELECT channel_id FROM tickets WHERE user_id = ? AND status = 'OPEN'",
            [user.id]
        );

        for (const t of openTickets) {
            const existingChannel = guild.channels.cache.get(t.channel_id) || await guild.channels.fetch(t.channel_id).catch(() => null);
            if (existingChannel) {
                return interaction.reply({
                    content: `⛔ Ya tienes un ticket activo en este momento: <#${existingChannel.id}>. Por favor ciérralo antes de abrir uno nuevo.`,
                    ephemeral: true
                });
            } else {
                await db.run("UPDATE tickets SET status = 'CLOSED' WHERE channel_id = ?", [t.channel_id]);
            }
        }

        const catConfig = config.categories.find(c => c.id === categoryId) || config.categories[0];

        // Buscar o crear categoría para este tipo
        const fakeSection = {
            name: catConfig.label,
            category_name: `🎫 TICKETS - ${catConfig.label.toUpperCase()}`,
            discord_category_id: config.categoryId || null
        };
        const discordCategory = await this.getOrCreateCategory(guild, fakeSection, bot);

        const overwrites = [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: bot.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        const rolesToGrant = new Set([...(config.supportRoles || []), ...(catConfig.pingRoles || [])]);
        for (const roleId of rolesToGrant) {
            if (guild.roles.cache.has(roleId)) {
                overwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.EmbedLinks,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });
            }
        }

        const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        const channelName = `${catConfig.channelPrefix}${cleanUsername}`;

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: discordCategory ? discordCategory.id : undefined,
            permissionOverwrites: overwrites,
            topic: `Ticket de ${user.tag} (${user.id}) | Categoría: ${catConfig.label}`
        });

        await db.run(
            `
            INSERT INTO tickets (channel_id, user_id, category, status, created_at)
            VALUES (?, ?, ?, 'OPEN', ?)
        `,
            [channel.id, user.id, catConfig.id, Date.now()]
        );

        const welcomeEmbed = new EmbedBuilder()
            .setColor(config.colors.embed)
            .setTitle(catConfig.welcomeTitle)
            .setDescription(
                `${catConfig.welcomeMessage}\n\n` +
                `👤 **Solicitante:** <@${user.id}> (\`${user.id}\`)\n` +
                `📁 **Categoría:** \`${catConfig.label}\`\n` +
                `📅 **Fecha de apertura:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setFooter({ text: "Sistema de Atención Militar • Ejército Nacional" })
            .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("TICK_CLOSE")
                .setLabel("Cerrar Ticket")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("TICK_CLAIM")
                .setLabel("Reclamar Atención")
                .setEmoji("👤")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("TICK_TRANSCRIPT")
                .setLabel("Transcripción")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Secondary)
        );

        const mentions = [user.toString(), ...Array.from(rolesToGrant).map(r => `<@&${r}>`)].join(" ");
        await channel.send({ content: mentions, embeds: [welcomeEmbed], components: [actionRow] });

        return interaction.reply({
            content: `✅ **Ticket creado exitosamente:** Ve a tu canal asignado en <#${channel.id}> (en la categoría **${discordCategory.name}**).`,
            ephemeral: true
        });
    },

    // ============================================================
    // RECLAMAR TICKET (CLAIM)
    // ============================================================
    async claimTicket(bot, interaction) {
        const isStaff = coreConfig.isGeneral(interaction.member) ||
            config.supportRoles.some(r => interaction.member?.roles?.cache?.has(r));

        if (!isStaff) {
            return interaction.reply({
                content: "⛔ Solo el personal militar de mando o soporte puede reclamar tickets.",
                ephemeral: true
            });
        }

        const db = bot.db;
        const channelId = interaction.channelId;

        const ticket = await db.get("SELECT * FROM tickets WHERE channel_id = ?", [channelId]);
        if (!ticket) {
            return interaction.reply({ content: "Este canal no figura como un ticket activo en la base de datos.", ephemeral: true });
        }

        if (ticket.claimed_by) {
            return interaction.reply({
                content: `⚠️ Este ticket ya fue reclamado por <@${ticket.claimed_by}>.`,
                ephemeral: true
            });
        }

        await db.run("UPDATE tickets SET claimed_by = ? WHERE channel_id = ?", [interaction.user.id, channelId]);

        const claimEmbed = new EmbedBuilder()
            .setColor(config.colors.gold)
            .setDescription(`👤 **Ticket Reclamado:** El oficial <@${interaction.user.id}> ha tomado el control de esta solicitud y estará a cargo de tu atención.`);

        await interaction.channel.send({ embeds: [claimEmbed] });

        return interaction.reply({
            content: "✅ Has reclamado este ticket con éxito.",
            ephemeral: true
        });
    },

    // ============================================================
    // CERRAR TICKET
    // ============================================================
    async requestClose(bot, interaction) {
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("TICK_CONFIRM_CLOSE")
                .setLabel("Confirmar Cierre Definitivo")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("TICK_CANCEL_CLOSE")
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            content: "⚠️ **¿Confirmas el cierre de este ticket?** Se generará una copia de seguridad y el canal será eliminado.",
            components: [confirmRow]
        });
    },

    async executeClose(bot, interaction, reason = "Cerrado por el usuario/mando") {
        const channel = interaction.channel;
        const db = bot.db;

        const ticket = await db.get("SELECT * FROM tickets WHERE channel_id = ?", [channel.id]);

        await interaction.update({
            content: "🔒 **Cerrando ticket militar...** Generando transcripción de auditoría...",
            components: []
        });

        // 1. Generar transcripción
        const transcriptAttachment = await this.generateTranscript(channel, ticket);

        // 2. Registrar en DB
        const now = Date.now();
        if (ticket) {
            await db.run(
                "UPDATE tickets SET status = 'CLOSED', closed_at = ?, closed_by = ? WHERE channel_id = ?",
                [now, interaction.user.id, channel.id]
            );
        }

        // 3. Enviar copia al canal de auditoría / logs
        const logChannelId = config.transcriptsChannel;
        if (logChannelId) {
            const logChannel = interaction.guild?.channels?.cache?.get(logChannelId) ||
                await bot.client.channels.fetch(logChannelId).catch(() => null);

            if (logChannel && logChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle("📁 TICKET MILITAR CERRADO — AUDITORÍA")
                    .setDescription(
                        `• **Canal:** \`#${channel.name}\`\n` +
                        `• **Solicitante:** ${ticket ? `<@${ticket.user_id}> (\`${ticket.user_id}\`)` : "N/A"}\n` +
                        `• **Categoría:** \`${ticket ? ticket.category : "General"}\`\n` +
                        `• **Atendido por:** ${ticket?.claimed_by ? `<@${ticket.claimed_by}>` : "*Sin reclamar*"}\n` +
                        `• **Cerrado por:** <@${interaction.user.id}>\n` +
                        `• **Motivo:** ${reason}\n` +
                        `• **Fecha:** <t:${Math.floor(now / 1000)}:F>`
                    )
                    .setFooter({ text: "Archivo y Transcripciones de Tickets" })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch(() => null);
            }
        }

        // 4. Intentar enviar DM al solicitante con la transcripción
        if (ticket?.user_id) {
            try {
                const targetUser = await bot.client.users.fetch(ticket.user_id).catch(() => null);
                if (targetUser) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(config.colors.embed)
                        .setTitle("📋 Copia de tu Ticket Militar")
                        .setDescription(`Tu ticket en **${interaction.guild.name}** ha sido cerrado. Adjuntamos la transcripción completa para tu respaldo.`);
                    await targetUser.send({ embeds: [dmEmbed], files: [transcriptAttachment] }).catch(() => null);
                }
            } catch (_) {}
        }

        // 5. Mensaje de despedida y borrado del canal
        await channel.send("🛑 **Ticket finalizado.** Este canal se autodestruirá en 5 segundos...");

        setTimeout(async () => {
            await channel.delete("Ticket finalizado y archivado").catch(() => null);
        }, 5000);
    },

    async generateTranscript(channel, ticket) {
        let messages = [];
        try {
            const fetched = await channel.messages.fetch({ limit: 100 });
            messages = Array.from(fetched.values()).reverse();
        } catch (_) {}

        let text = "========================================================\n";
        text += `TRANSCRIPCIÓN DE TICKET MILITAR — #${channel.name}\n`;
        text += `Servidor: ${channel.guild.name}\n`;
        text += `Fecha de exportación: ${new Date().toLocaleString("es-ES")}\n`;
        if (ticket) {
            text += `Solicitante ID: ${ticket.user_id}\n`;
            text += `Categoría: ${ticket.category}\n`;
            text += `Reclamado por ID: ${ticket.claimed_by || "Ninguno"}\n`;
        }
        text += "========================================================\n\n";

        for (const msg of messages) {
            const time = new Date(msg.createdTimestamp).toLocaleString("es-ES");
            const author = `${msg.author.tag} (${msg.author.id})`;
            let line = `[${time}] ${author}:\n${msg.content || ""}\n`;

            if (msg.attachments.size > 0) {
                line += `  [Archivos Adjuntos]: ${msg.attachments.map(a => a.url).join(", ")}\n`;
            }
            if (msg.embeds.length > 0) {
                line += `  [Embed]: ${msg.embeds.map(e => e.title || e.description || "").join(" | ")}\n`;
            }
            text += line + "\n";
        }

        return new AttachmentBuilder(Buffer.from(text, "utf-8"), {
            name: `transcripcion-${channel.name}-${Date.now()}.txt`
        });
    },

    async addUser(bot, interaction, targetUser) {
        const channel = interaction.channel;
        const db = bot.db;

        const ticket = await db.get("SELECT * FROM tickets WHERE channel_id = ?", [channel.id]);
        if (!ticket) {
            return interaction.reply({ content: "Este comando solo puede ejecutarse dentro de un canal de ticket.", ephemeral: true });
        }

        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true,
            ReadMessageHistory: true
        });

        return interaction.reply({
            content: `👤 <@${targetUser.id}> ha sido añadido al ticket.`
        });
    },

    async removeUser(bot, interaction, targetUser) {
        const channel = interaction.channel;
        const db = bot.db;

        const ticket = await db.get("SELECT * FROM tickets WHERE channel_id = ?", [channel.id]);
        if (!ticket) {
            return interaction.reply({ content: "Este comando solo puede ejecutarse dentro de un canal de ticket.", ephemeral: true });
        }

        if (targetUser.id === ticket.user_id) {
            return interaction.reply({ content: "No puedes expulsar al creador del ticket.", ephemeral: true });
        }

        await channel.permissionOverwrites.delete(targetUser.id).catch(() => null);

        return interaction.reply({
            content: `🚪 <@${targetUser.id}> ha sido removido del ticket.`
        });
    }
};
