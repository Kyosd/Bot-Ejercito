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
const panelManager = require("./panelManager");

module.exports = {
    // ============================================================
    // GESTOR DINÁMICO DE CATEGORÍAS EN DISCORD
    // ============================================================
    async getOrCreateCategory(guild, categoryName, targetCategoryId = null, roleIds = [], bot = null) {
        let category = null;

        // 1. Intentar buscar por ID si ya está guardado
        if (targetCategoryId) {
            category = guild.channels.cache.get(targetCategoryId) ||
                await guild.channels.fetch(targetCategoryId).catch(() => null);

            if (category && category.type !== ChannelType.GuildCategory) {
                category = null;
            }
        }

        // 2. Si no se encontró por ID, buscar por nombre en el servidor (case-insensitive)
        if (!category && categoryName) {
            const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
            category = channels.find(
                c => c && c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
            );
        }

        // 3. Control de límite de 50 canales por categoría de Discord
        if (category && category.children?.cache?.size >= 50) {
            const nextName = `${categoryName || category.name} 2`;
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
                            id: guild.client.user.id,
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

        // 4. Si la categoría no existe en el servidor, crearla automáticamente
        if (!category && categoryName) {
            const overwrites = [
                {
                    id: guild.id, // @everyone oculto
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: guild.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageRoles
                    ]
                }
            ];

            // Roles específicos de atención
            for (const rId of (roleIds || [])) {
                if (guild.roles.cache.has(rId) || await guild.roles.fetch(rId).catch(() => null)) {
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

            // Roles generales de alto mando
            for (const rId of (coreConfig.generals || [])) {
                if (guild.roles.cache.has(rId) || await guild.roles.fetch(rId).catch(() => null)) {
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

        return category;
    },

    // ============================================================
    // CREAR TICKET DESDE PANEL DINÁMICO INSTITUCIONAL (V2)
    // ============================================================
    async createDynamicTicket(bot, interaction, optionId, formResponses = []) {
        const guild = interaction.guild;
        const user = interaction.user;
        const db = bot.db;

        const option = await panelManager.getOptionById(bot, optionId);
        if (!option || option.status !== "ACTIVE") {
            return interaction.reply({
                content: "❌ Esta opción de atención ya no se encuentra activa o no existe.",
                ephemeral: true
            });
        }

        const panel = await panelManager.getPanelById(bot, option.panel_id);
        if (!panel || panel.status !== "ACTIVE") {
            return interaction.reply({
                content: "❌ El panel de atención al que pertenece esta opción está desactivado temporalmente.",
                ephemeral: true
            });
        }

        // 1. Control de límite de tickets abiertos por usuario para esta opción
        const limit = option.ticket_limit || 1;
        const openTickets = await db.all(
            "SELECT id, channel_id FROM tickets WHERE user_id = ? AND option_id = ? AND status = 'OPEN'",
            [user.id, option.id]
        );

        // Validar canales existentes
        let realOpenCount = 0;
        for (const t of openTickets) {
            const exists = guild.channels.cache.get(t.channel_id) || await guild.channels.fetch(t.channel_id).catch(() => null);
            if (exists) {
                realOpenCount++;
            } else {
                await db.run("UPDATE tickets SET status = 'CLOSED' WHERE id = ?", [t.id]);
            }
        }

        if (realOpenCount >= limit) {
            return interaction.reply({
                content: `⛔ Ya tienes **${realOpenCount} ticket(s) abierto(s)** en la sección de **${option.name}** (Límite permitido: ${limit}). Por favor resuelve tus solicitudes activas antes de abrir otra.`,
                ephemeral: true
            });
        }

        // 2. Determinar categoría de Discord (Prioridad: Opción -> Panel -> General)
        const targetCatId = option.discord_category_id || panel.default_category_id || config.categoryId;
        const categoryName = `🎫 TICKETS - ${option.name.toUpperCase()}`;

        // Obtener roles autorizados específicos de la opción
        let optionRoles = [];
        try {
            optionRoles = JSON.parse(option.roles || "[]");
        } catch (_) {}

        // Si la opción no tiene roles propios, hereda los roles por defecto del panel
        if (optionRoles.length === 0) {
            try {
                optionRoles = JSON.parse(panel.default_roles || "[]");
            } catch (_) {}
        }

        // Si aún así no hay roles, usar los generales del sistema
        if (optionRoles.length === 0) {
            optionRoles = config.supportRoles || [];
        }

        const discordCategory = await this.getOrCreateCategory(guild, categoryName, targetCatId, optionRoles, bot);

        // 3. Configurar permisos del canal privado
        const overwrites = [
            {
                id: guild.id, // @everyone oculto para privacidad
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: bot.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageRoles,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: user.id, // Solicitante
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        // Roles de atención específicos de la opción (AISLADOS DE OTRAS DIVISIONES)
        for (const roleId of optionRoles) {
            if (guild.roles.cache.has(roleId) || await guild.roles.fetch(roleId).catch(() => null)) {
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

        // Supervisión de Alto Mando / Generales
        for (const rId of (coreConfig.generals || [])) {
            if (!optionRoles.includes(rId) && (guild.roles.cache.has(rId) || await guild.roles.fetch(rId).catch(() => null))) {
                overwrites.push({
                    id: rId,
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

        // 4. Nombre del canal
        const cleanPrefix = (option.prefix || "ticket-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
        const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        const ticketCounterRow = await db.get("SELECT COUNT(*) AS total FROM tickets");
        const nextNum = String((ticketCounterRow?.total || 0) + 1).padStart(3, "0");
        const channelName = `${cleanPrefix}${cleanUsername}-${nextNum}`.slice(0, 32);

        // 5. Crear el canal privado en Discord
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: discordCategory ? discordCategory.id : undefined,
            permissionOverwrites: overwrites,
            topic: `Ticket de ${user.tag} (${user.id}) | Panel: ${panel.name} | Opción: ${option.name}`
        });

        // 6. Registrar ticket en SQLite
        const now = Date.now();
        await db.run(
            `
            INSERT INTO tickets (channel_id, user_id, category, panel_id, option_id, option_name, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
            `,
            [channel.id, user.id, option.name, panel.id, option.id, option.name, now]
        );

        const newTicketRow = await db.get("SELECT id FROM tickets WHERE channel_id = ?", [channel.id]);
        const ticketId = newTicketRow ? newTicketRow.id : 0;

        // 7. Guardar respuestas del formulario en SQLite si las hubo
        if (formResponses.length > 0) {
            await panelManager.saveResponses(bot, ticketId, formResponses);
        }

        // 8. Construir mensaje inicial con variables dinámicas
        let welcomeText = option.welcome_message || `Bienvenido <@${user.id}> a la sección de **${option.name}**.\nUn encargado atenderá tu caso en breve.`;
        welcomeText = welcomeText
            .replace(/{user}/g, `<@${user.id}>`)
            .replace(/{panel}/g, panel.name)
            .replace(/{option}/g, option.name)
            .replace(/{ticket}/g, `#${channel.name}`)
            .replace(/{id}/g, String(ticketId));

        const welcomeEmbed = new EmbedBuilder()
            .setColor(panel.embed_color || config.colors.embed)
            .setTitle(`${option.emoji || "🎫"} ${option.name} — Atención Institucional`)
            .setDescription(
                `${welcomeText}\n\n` +
                `• **Solicitante:** <@${user.id}> (\`${user.id}\`)\n` +
                `• **Panel:** \`${panel.name}\`\n` +
                `• **Sección:** \`${option.name}\`\n` +
                `• **Categoría:** \`${discordCategory ? discordCategory.name : "General"}\`\n` +
                `• **Fecha de Apertura:** <t:${Math.floor(now / 1000)}:F>`
            )
            .setFooter({ text: "Sistema Institucional de Atención • Ejército Nacional" })
            .setTimestamp();

        if (panel.embed_thumbnail) {
            welcomeEmbed.setThumbnail(panel.embed_thumbnail);
        }

        // Presentar respuestas del formulario en un embed complementario
        const embedsToSend = [welcomeEmbed];

        if (formResponses.length > 0) {
            const formEmbed = new EmbedBuilder()
                .setColor(coreConfig.colors?.militaryGold || "#d4af37")
                .setTitle("📝 Información del Formulario Registrado")
                .setDescription("Datos proporcionados por el solicitante al momento de la apertura:")
                .addFields(
                    formResponses.map(r => ({
                        name: `🔹 ${r.field_label}`.slice(0, 256),
                        value: (r.response_value || "*Sin respuesta*").slice(0, 1024),
                        inline: false
                    }))
                )
                .setFooter({ text: `Formulario registrado • Ticket #${ticketId}` });

            embedsToSend.push(formEmbed);
        }

        // Botones de gestión del ticket
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

        // Menciones a roles autorizados y solicitante
        const mentions = [
            user.toString(),
            ...optionRoles.map(r => `<@&${r}>`)
        ].filter(Boolean).join(" ");

        await channel.send({ content: mentions, embeds: embedsToSend, components: [actionRow] });

        const confirmText = `✅ **Ticket creado exitosamente:** Dirígete a <#${channel.id}> para ser atendido en la sección de **${option.name}**.`;

        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: confirmText, ephemeral: true });
        } else {
            return interaction.reply({ content: confirmText, ephemeral: true });
        }
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

        // 1. Generar transcripción completa
        const transcriptAttachment = await this.generateTranscript(channel, ticket);

        // 2. Registrar cierre en DB
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
                        `• **Sección / Opción:** \`${ticket ? (ticket.option_name || ticket.category) : "General"}\`\n` +
                        `• **Atendido por:** ${ticket?.claimed_by ? `<@${ticket.claimed_by}>` : "*Sin reclamar*"}\n` +
                        `• **Cerrado por:** <@${interaction.user.id}>\n` +
                        `• **Motivo:** ${reason}\n` +
                        `• **Fecha:** <t:${Math.floor(now / 1000)}:F>`
                    )
                    .setFooter({ text: "Archivo y Transcripciones de Tickets • Ejército Nacional" })
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
                        .setDescription(`Tu ticket en **${interaction.guild.name}** (\`#${channel.name}\`) ha sido cerrado. Adjuntamos la transcripción completa para tu respaldo.`);
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
        const collected = [];
        try {
            let lastId;
            for (let i = 0; i < 50; i++) {
                const batch = await channel.messages.fetch({
                    limit: 100,
                    ...(lastId ? { before: lastId } : {})
                });
                if (!batch.size) break;
                collected.push(...batch.values());
                lastId = batch.last().id;
                if (batch.size < 100) break;
            }
        } catch (err) {
            console.error("[tickets] Error leyendo mensajes para transcripción:", err);
        }

        const messages = collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let text = "========================================================\n";
        text += `TRANSCRIPCIÓN DE TICKET MILITAR — #${channel.name}\n`;
        text += `Servidor: ${channel.guild.name}\n`;
        text += `Fecha de exportación: ${new Date().toLocaleString("es-ES")}\n`;
        if (ticket) {
            text += `Solicitante ID: ${ticket.user_id}\n`;
            text += `Sección / Categoría: ${ticket.option_name || ticket.category}\n`;
            text += `Reclamado por ID: ${ticket.claimed_by || "Ninguno"}\n`;
        }
        text += "========================================================\n\n";

        for (const msg of messages) {
            const time = new Date(msg.createdTimestamp).toLocaleString("es-ES");
            const botTag = msg.author.bot ? " [BOT]" : "";
            const author = `${msg.author.tag || msg.author.username}${botTag} (${msg.author.id})`;
            const bodyParts = [];

            if (msg.reference?.messageId) {
                bodyParts.push(`(responde a ${msg.reference.messageId})`);
            }
            if (msg.content && msg.content.trim()) {
                bodyParts.push(msg.content);
            }
            if (msg.stickers?.size) {
                bodyParts.push(`[Stickers]: ${msg.stickers.map(s => s.name).join(", ")}`);
            }
            if (msg.attachments.size > 0) {
                bodyParts.push(`[Archivos]: ${msg.attachments.map(a => a.url).join(", ")}`);
            }
            if (msg.embeds.length > 0) {
                bodyParts.push(`[Embed]: ${msg.embeds.map(e => e.title || e.description || e.author?.name || "(embed)").join(" | ")}`);
            }
            if (!bodyParts.length) {
                bodyParts.push("(mensaje sin texto)");
            }

            text += `[${time}] ${author}:\n${bodyParts.join("\n")}\n\n`;
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
