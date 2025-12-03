"use strict";

module.exports = {
    // Servidor donde opera el sistema de horas
    guildId: "1359765875636310058",

    // IDs de usuarios o roles con permisos de general
    generals: [
         "1398131944872480890"
         ,"1420882354775527484",
         "1392985835355508766",
         "1392985835355508766"
        
    ],

    // Canales usados por el módulo de horas
    channels: {
        // Panel principal (entrar/salir + botón Panel de Generales)
        principal: "1398132225223950469",

        // Canal para reporte semanal automático
        report: "1443688275608080394",

        // Canal de logs internos del sistema de horas
        logs: "1416997231499935875"
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
