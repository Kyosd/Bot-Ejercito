"use strict";

module.exports = {
  name: "interactionCreate",

  async execute(bot, interaction) {
    const hours = bot.modules?.hours;
    if (!hours) return;

    try {
      // BOTONES
      if (interaction.isButton()) {
        if (interaction.customId?.startsWith("HOURS_")) {
          return hours.ui.route(bot, interaction);
        }
        return;
      }

      // SELECT MENUS (Tanto StringSelectMenu como UserSelectMenu)
      if (interaction.isAnySelectMenu && interaction.isAnySelectMenu()) {
        const id = interaction.customId || "";

        if (id === "HOURS_GENERAL_MENU") {
          return hours.admin.handleGeneralMenu(bot, interaction);
        }

        if (id.startsWith("HOURS_GENERAL_TARGET_")) {
          return hours.admin.handleTargetSelect(bot, interaction);
        }

        return;
      }

      // MODALS
      if (interaction.isModalSubmit()) {
        if ((interaction.customId || "").startsWith("MOD_HOURS_")) {
          return hours.admin.handleModal(bot, interaction);
        }
      }
    } catch (err) {
      console.error("[hours interactionCreate] Error:", err);

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "Ocurrió un error procesando la interacción del sistema de horas.",
            ephemeral: true
          });
        }
      } catch (_) {}
    }
  }
};
