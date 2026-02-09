"use strict";

const scheduler = require("./scheduler");
const livePanel = require("./livepanel");

module.exports = {
  name: "hours",

  onLoad(bot) {
    this.config  = require("./config");
    this.service = require("./service");
    this.embeds  = require("./embeds");
    this.admin   = require("./admin");
    this.weekly  = require("./weekly");
    this.ui      = require("./ui");
    this.logs    = require("./logs");
    this.livePanel = livePanel;

    bot.modules = bot.modules || {};
    bot.modules.hours = this;

    try {
      scheduler.start(bot);
      console.log("[hours] Scheduler iniciado correctamente.");
    } catch (err) {
      console.error("[hours] Error iniciando scheduler:", err);
    }

    // ✅ LIVE PANEL
    try {
      livePanel.init(bot);
    } catch (err) {
      console.error("[hours] Error iniciando livePanel:", err);
    }
  },

  async deployUI(bot) {
    return this.ui.deploy(bot);
  },

  async handleButton(bot, interaction) {
    return this.ui.route(bot, interaction);
  },

  async handleModal(bot, interaction) {
    return this.admin.handleModal(bot, interaction);
  },

  async weeklyReport(bot, auto = false) {
    return this.weekly.generate(bot, auto);
  }
};
