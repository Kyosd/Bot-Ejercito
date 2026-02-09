"use strict";

module.exports = {
  guildId: "1359765875636310058",

  // IDs de usuarios o roles con permisos de general
  generals: [
    "1398131944872480890",
    "1420882354775527484",
    "1392985835355508766",
    "1396673898984112168",
  ],

  channels: {
    principal: "1398132225223950469",
    report: "1443688275608080394",
    logs: "1416997231499935875",

    // ✅ NUEVO: canal donde irá el embed “Staff en Servicio”
    // Pon el ID del canal donde quieres que aparezca ese panel.
    liveStatus: "1398132225223950469"
  },

  system: {
    name: "Ejército Nacional — Sistema de Horas",
    footer: "Comando Central de Servicio"
  },

  colors: {
    ui:      "#2d5a27",
    embed:   "#3b6b34",
    log:     "#1f2a1a",
    warning: "#c29d2a",
    danger:  "#8b1e1e",
    success: "#4b8b3b"
  },

  settings: {
    minSessionMinutes: 1,
    weeklyResetDay: 0,
    weeklyResetHour: 6,
    weeklyResetMinute: 0
  },

  // ✅ NUEVO: panel en tiempo real
  livePanel: {
    enabled: true,

    // Si es null, se crea el mensaje y se guarda el ID en SQLite (hours_meta)
    messageId: null,

    // Respaldo: refresca cada X segundos
    refreshSeconds: 30,

    mentionUsers: true,
    showSince: true
  }
};
