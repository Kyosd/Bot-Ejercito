"use strict";

module.exports = {
    // Servidor donde opera el sistema de horas
    guildId: "1202399115393114133",

    // IDs de usuarios o roles con permisos de general
    generals: [
         "434520425288957956",
        // "ID_USUARIO_O_ROL_2"
    ],

    // Canales usados por el módulo de horas
    channels: {
        // Panel principal (entrar/salir + botón Panel de Generales)
        principal: "1442198055368786120",

        // Canal para reporte semanal automático
        report: "1442198095759806525",

        // Canal de logs internos del sistema de horas
        logs: "1400807216822620251"
    },

    // Identidad del sistema
    system: {
        name: "Ejército Nacional — Sistema de Horas",
        footer: "Comando Central de Servicio"
    },

    // Paleta militar
    colors: {
        ui:      "#2d5a27", // verde oliva panel
        embed:   "#3b6b34", // verde principal embeds
        log:     "#1f2a1a", // verde muy oscuro logs
        warning: "#c29d2a", // dorado advertencia
        danger:  "#8b1e1e", // rojo oscuro
        success: "#4b8b3b"  // verde éxito
    },

    // Config operativa
    settings: {
        minSessionMinutes: 1,
        weeklyResetDay: 0,       // 0 = domingo
        weeklyResetHour: 6,      // 06:00
        weeklyResetMinute: 0
    }
};
