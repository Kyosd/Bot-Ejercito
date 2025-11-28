// modules/sanctions/index.js
const path = require("path");

module.exports = {
    name: "sanctions",

    // Aquí van módulos, no rutas en string
    commands: [
        require(path.join(__dirname, "commands", "sancionar.js"))
    ],

    events: [
        require(path.join(__dirname, "panel.js"))
    ],

    onLoad(bot) {
        console.log("[SANCIONES] Módulo cargado correctamente.");
    }
};
