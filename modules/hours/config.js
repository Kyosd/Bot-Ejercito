"use strict";

const core = require("../../core/config");

module.exports = {
  guildId: core.guildId,

  generals: core.generals,

  channels: {
    principal: core.channels.principal,
    report: core.channels.report,
    logs: core.channels.logs,
    liveStatus: core.channels.liveStatus
  },

  system: {
    name: "Ejército Nacional — Servicio",
    footer: "Comando Central de Servicio"
  },

  colors: {
    ui:      core.colors.ui,
    embed:   core.colors.embed,
    log:     core.colors.log,
    warning: core.colors.warning,
    danger:  core.colors.danger,
    success: core.colors.success
  },

  settings: {
    minSessionMinutes: 1,
    weeklyResetDay: 0,
    weeklyResetHour: 6,
    weeklyResetMinute: 0
  },

  livePanel: {
    enabled: true,
    messageId: null,
    refreshSeconds: 20,
    mentionUsers: true,
    showSince: true
  }
};
