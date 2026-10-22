// modules/tickets/config.js
"use strict";

const coreConfig = require("../../core/config");

module.exports = {
    // ID de la Categoría de Discord donde se crearán los canales de ticket
    // (Si es null o no existe, el canal se creará sin categoría padre)
    categoryId: process.env.TICKETS_CATEGORY_ID || null,

    // Canal donde se envían las transcripciones y logs al cerrar un ticket
    transcriptsChannel: process.env.TICKETS_TRANSCRIPTS_CHANNEL || coreConfig.channels.logs,

    // Roles del Alto Mando o Soporte que tendrán acceso a todos los tickets
    supportRoles: coreConfig.generals || [
        "1398131944872480890",
        "1420882354775527484",
        "1392985835355508766",
        "1396673898984112168"
    ],

    // Máximo de tickets abiertos simultáneos por usuario
    maxOpenTicketsPerUser: 1,

    // Colores del sistema
    colors: {
        embed: "#2d5a27",
        gold: "#d4af37",
        danger: "#8b1e1e",
        info: "#1e2b3c"
    },

    // Categorías de tickets 100% personalizables
    categories: [
        {
            id: "soporte",
            label: "Dudas y Soporte General",
            description: "Consultas sobre el ejército, horarios y funciones",
            emoji: "❓",
            channelPrefix: "soporte-",
            welcomeTitle: "Soporte General — Ejército Nacional",
            welcomeMessage: "Bienvenido. Un oficial de guardia atenderá tu consulta en breve.\nPor favor, escribe detalladamente en qué podemos ayudarte.",
            pingRoles: [] // Roles específicos a mencionar al abrirse
        },
        {
            id: "reclutamiento",
            label: "Alistamiento y Reclutamiento",
            description: "Postulación para ingresar como nuevo soldado",
            emoji: "🎖️",
            channelPrefix: "alistamiento-",
            welcomeTitle: "Oficina de Reclutamiento Militar",
            welcomeMessage: "Bienvenido aspirante. Por favor, proporciona tu Nombre, Edad, Disponibilidad horaria y experiencia previa en facciones militares.",
            pingRoles: []
        },
        {
            id: "denuncias",
            label: "Asuntos Internos / Denuncias",
            description: "Reportar faltas disciplinarias o abusos",
            emoji: "⚖️",
            channelPrefix: "asuntos-internos-",
            welcomeTitle: "Asuntos Internos y Régimen Disciplinario",
            welcomeMessage: "Este canal es estrictamente confidencial. Adjunta los nombres de los implicados y enlaces con pruebas visuales (imágenes/videos).",
            pingRoles: []
        },
        {
            id: "alto_mando",
            label: "Atención del Alto Mando",
            description: "Asuntos diplomáticos o temas de máxima relevancia",
            emoji: "⭐",
            channelPrefix: "alto-mando-",
            welcomeTitle: "Despacho del Alto Mando",
            welcomeMessage: "Canal reservado para la atención directa de Generales y Comandantes en Jefe de la facción.",
            pingRoles: []
        }
    ]
};
