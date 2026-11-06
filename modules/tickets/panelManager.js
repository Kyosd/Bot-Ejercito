// modules/tickets/panelManager.js
"use strict";

const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const coreConfig = require("../../core/config");

module.exports = {
    // ============================================================
    // GESTIÓN DE PANELES
    // ============================================================

    async createPanel(bot, data) {
        const db = bot.db;
        const now = Date.now();
        const customId = data.custom_id || data.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32);

        await db.run(
            `
            INSERT INTO ticket_panels (
                custom_id, name, description, channel_id, default_category_id,
                embed_title, embed_description, embed_color, embed_image,
                embed_thumbnail, embed_footer, default_roles, status, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                customId,
                data.name,
                data.description || "",
                data.channel_id || null,
                data.default_category_id || null,
                data.embed_title || `Atención Institucional — ${data.name}`,
                data.embed_description || "Selecciona una opción del menú desplegable inferior para ser atendido por el personal correspondiente.",
                data.embed_color || coreConfig.colors?.militaryGold || "#2d5a27",
                data.embed_image || null,
                data.embed_thumbnail || null,
                data.embed_footer || "Sistema Institucional de Atención • Ejército Nacional",
                JSON.stringify(data.default_roles || []),
                data.status || "ACTIVE",
                data.created_by || null,
                now,
                now
            ]
        );

        return this.getPanelByCustomId(bot, customId);
    },

    async updatePanel(bot, panelId, fields) {
        const db = bot.db;
        const setClauses = [];
        const params = [];

        for (const [key, val] of Object.entries(fields)) {
            setClauses.push(`${key} = ?`);
            params.push(val);
        }

        setClauses.push("updated_at = ?");
        params.push(Date.now());

        params.push(panelId);

        await db.run(
            `UPDATE ticket_panels SET ${setClauses.join(", ")} WHERE id = ?`,
            params
        );

        return this.getPanelById(bot, panelId);
    },

    async deletePanel(bot, panelId) {
        const db = bot.db;
        // Eliminar opciones, formularios y campos asociados
        const options = await this.getOptionsByPanelId(bot, panelId);
        for (const opt of options) {
            await this.deleteOption(bot, opt.id);
        }

        await db.run("DELETE FROM ticket_panels WHERE id = ?", [panelId]);
    },

    async getPanelById(bot, id) {
        return bot.db.get("SELECT * FROM ticket_panels WHERE id = ?", [id]);
    },

    async getPanelByCustomId(bot, customId) {
        return bot.db.get("SELECT * FROM ticket_panels WHERE custom_id = ? OR name = ?", [customId, customId]);
    },

    async getAllPanels(bot) {
        return bot.db.all("SELECT * FROM ticket_panels ORDER BY id ASC");
    },

    async getActiveTicketsCountForPanel(bot, panelId) {
        const row = await bot.db.get(
            "SELECT COUNT(*) AS count FROM tickets WHERE panel_id = ? AND status = 'OPEN'",
            [panelId]
        );
        return row?.count || 0;
    },

    // ============================================================
    // GESTIÓN DE OPCIONES
    // ============================================================

    async addOption(bot, panelId, data) {
        const db = bot.db;
        const now = Date.now();
        const customId = data.custom_id || data.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32);

        await db.run(
            `
            INSERT INTO ticket_options (
                panel_id, custom_id, name, description, emoji,
                prefix, discord_category_id, roles, welcome_message,
                ticket_limit, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                panelId,
                customId,
                data.name,
                data.description || "",
                data.emoji || "🎫",
                data.prefix || "ticket-",
                data.discord_category_id || null,
                JSON.stringify(data.roles || []),
                data.welcome_message || `Bienvenido a la sección de **${data.name}**.\nUn encargado atenderá tu caso a la brevedad.`,
                data.ticket_limit !== undefined ? data.ticket_limit : 1,
                data.status || "ACTIVE",
                now,
                now
            ]
        );

        return this.getOptionByCustomId(bot, panelId, customId);
    },

    async updateOption(bot, optionId, fields) {
        const db = bot.db;
        const setClauses = [];
        const params = [];

        for (const [key, val] of Object.entries(fields)) {
            setClauses.push(`${key} = ?`);
            params.push(val);
        }

        setClauses.push("updated_at = ?");
        params.push(Date.now());

        params.push(optionId);

        await db.run(
            `UPDATE ticket_options SET ${setClauses.join(", ")} WHERE id = ?`,
            params
        );

        return this.getOptionById(bot, optionId);
    },

    async deleteOption(bot, optionId) {
        const db = bot.db;
        // Eliminar formulario y campos asociados
        const form = await this.getFormByOptionId(bot, optionId);
        if (form) {
            await db.run("DELETE FROM ticket_form_fields WHERE form_id = ?", [form.id]);
            await db.run("DELETE FROM ticket_forms WHERE id = ?", [form.id]);
        }

        await db.run("DELETE FROM ticket_options WHERE id = ?", [optionId]);
    },

    async getOptionById(bot, id) {
        return bot.db.get("SELECT * FROM ticket_options WHERE id = ?", [id]);
    },

    async getOptionByCustomId(bot, panelId, customId) {
        return bot.db.get(
            "SELECT * FROM ticket_options WHERE panel_id = ? AND (custom_id = ? OR name = ?)",
            [panelId, customId, customId]
        );
    },

    async getOptionsByPanelId(bot, panelId) {
        return bot.db.all("SELECT * FROM ticket_options WHERE panel_id = ? ORDER BY id ASC", [panelId]);
    },

    // ============================================================
    // GESTIÓN DE FORMULARIOS Y CAMPOS
    // ============================================================

    async getFormByOptionId(bot, optionId) {
        return bot.db.get("SELECT * FROM ticket_forms WHERE option_id = ?", [optionId]);
    },

    async getOrCreateForm(bot, optionId, title = "Formulario de Atención") {
        let form = await this.getFormByOptionId(bot, optionId);
        if (!form) {
            const now = Date.now();
            await bot.db.run(
                "INSERT INTO ticket_forms (option_id, title, description, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
                [optionId, title, now, now]
            );
            form = await this.getFormByOptionId(bot, optionId);
        }
        return form;
    },

    async getFieldsByFormId(bot, formId) {
        return bot.db.all("SELECT * FROM ticket_form_fields WHERE form_id = ? ORDER BY field_order ASC, id ASC", [formId]);
    },

    async addFormField(bot, formId, data) {
        const db = bot.db;
        const customId = data.custom_id || data.label.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32);

        await db.run(
            `
            INSERT INTO ticket_form_fields (
                form_id, custom_id, label, description, field_type,
                placeholder, required, min_length, max_length, field_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                formId,
                customId,
                data.label,
                data.description || "",
                data.field_type || "SHORT",
                data.placeholder || "",
                data.required !== undefined ? (data.required ? 1 : 0) : 1,
                data.min_length || null,
                data.max_length || null,
                data.field_order || 0
            ]
        );

        return db.get("SELECT * FROM ticket_form_fields WHERE form_id = ? AND custom_id = ?", [formId, customId]);
    },

    async deleteFormField(bot, fieldId) {
        return bot.db.run("DELETE FROM ticket_form_fields WHERE id = ?", [fieldId]);
    },

    async saveResponses(bot, ticketId, responses) {
        const db = bot.db;
        const now = Date.now();
        for (const resp of responses) {
            await db.run(
                `
                INSERT INTO ticket_responses (ticket_id, field_id, field_label, response_value, created_at)
                VALUES (?, ?, ?, ?, ?)
                `,
                [ticketId, resp.field_id || null, resp.field_label, resp.response_value, now]
            );
        }
    },

    async getResponsesByTicketId(bot, ticketId) {
        return bot.db.all("SELECT * FROM ticket_responses WHERE ticket_id = ? ORDER BY id ASC", [ticketId]);
    },

    // ============================================================
    // CONSTRUCCIÓN VISUAL Y PUBLICACIÓN EN DISCORD
    // ============================================================

    async buildPanelPayload(bot, panelId) {
        const panel = await this.getPanelById(bot, panelId);
        if (!panel) return null;

        const options = await this.getOptionsByPanelId(bot, panelId);
        const activeOptions = options.filter(o => o.status === "ACTIVE");

        const embed = new EmbedBuilder()
            .setColor(panel.embed_color || coreConfig.colors?.militaryGold || "#2d5a27")
            .setTitle(panel.embed_title || `Atención Institucional — ${panel.name}`)
            .setDescription(panel.embed_description || "Selecciona una opción del menú desplegable para abrir un ticket.")
            .setFooter({ text: panel.embed_footer || "Sistema Institucional de Atención • Ejército Nacional" })
            .setTimestamp();

        if (panel.embed_image && (panel.embed_image.startsWith("http://") || panel.embed_image.startsWith("https://"))) {
            embed.setImage(panel.embed_image);
        }

        if (panel.embed_thumbnail && (panel.embed_thumbnail.startsWith("http://") || panel.embed_thumbnail.startsWith("https://"))) {
            embed.setThumbnail(panel.embed_thumbnail);
        }

        const components = [];

        if (activeOptions.length > 0) {
            // Manejar paginación de opciones si supera los 25 elementos permitidos por Discord
            const chunkSize = 25;
            for (let i = 0; i < activeOptions.length; i += chunkSize) {
                const chunk = activeOptions.slice(i, i + chunkSize);
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`PANEL_SELECT_${panel.id}_${Math.floor(i / chunkSize)}`)
                    .setPlaceholder(
                        activeOptions.length > chunkSize
                            ? `Selecciona una opción (Parte ${Math.floor(i / chunkSize) + 1})…`
                            : "Selecciona el departamento o división que necesitas…"
                    );

                const selectOptions = chunk.map(opt => {
                    const item = {
                        label: opt.name.slice(0, 100),
                        value: `PANEL_OPT_${opt.id}`,
                        description: (opt.description || "Solicitud de atención").slice(0, 100)
                    };
                    if (opt.emoji && opt.emoji.trim()) {
                        item.emoji = opt.emoji.trim();
                    }
                    return item;
                });

                selectMenu.addOptions(selectOptions);
                components.push(new ActionRowBuilder().addComponents(selectMenu));
            }
        } else {
            embed.addFields({
                name: "⚠️ Sin opciones activas",
                value: "Actualmente no hay opciones de atención configuradas en este panel."
            });
        }

        return { embeds: [embed], components };
    },

    async publishPanel(bot, panelId, targetChannel) {
        const payload = await this.buildPanelPayload(bot, panelId);
        if (!payload) throw new Error("El panel no existe en la base de datos.");

        const panel = await this.getPanelById(bot, panelId);
        let sentMessage = null;

        // Si ya tenía un mensaje publicado en ese canal, intentar editarlo para no duplicar
        if (panel.message_id && panel.channel_id === targetChannel.id) {
            try {
                const oldMsg = await targetChannel.messages.fetch(panel.message_id).catch(() => null);
                if (oldMsg) {
                    sentMessage = await oldMsg.edit(payload);
                }
            } catch (_) {}
        }

        if (!sentMessage) {
            sentMessage = await targetChannel.send(payload);
        }

        await this.updatePanel(bot, panelId, {
            channel_id: targetChannel.id,
            message_id: sentMessage.id
        });

        return sentMessage;
    },

    async refreshPublishedPanels(bot) {
        const panels = await this.getAllPanels(bot);
        let updatedCount = 0;

        for (const panel of panels) {
            if (panel.status !== "ACTIVE" || !panel.channel_id || !panel.message_id) continue;

            try {
                const channel = await bot.client.channels.fetch(panel.channel_id).catch(() => null);
                if (!channel || !channel.isTextBased()) continue;

                const msg = await channel.messages.fetch(panel.message_id).catch(() => null);
                if (!msg) {
                    console.warn(`[tickets] Panel "${panel.name}" (${panel.id}) tiene mensaje huérfano. Se puede republicar con /panel publicar.`);
                    continue;
                }

                const payload = await this.buildPanelPayload(bot, panel.id);
                if (payload) {
                    await msg.edit(payload).catch(() => null);
                    updatedCount++;
                }
            } catch (err) {
                console.warn(`[tickets] Error refrescando panel ${panel.id}:`, err.message);
            }
        }

        if (updatedCount > 0) {
            console.log(`[tickets] ✅ ${updatedCount} paneles institucionales sincronizados y actualizados en Discord.`);
        }
    }
};
