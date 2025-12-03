// modules/sanctions/index.js
const path = require("path");

module.exports = {
    name: "sanctions",

    // El loader se encargará de inyectar config.js aquí como .config
    commands: [
        require(path.join(__dirname, "commands", "sancionar.js"))
    ],

    events: [
        require(path.join(__dirname, "events", "interaction.js"))
    ],

    onLoad(bot) {
        console.log("[SANCIONES] Módulo cargado correctamente.");
    }
};
