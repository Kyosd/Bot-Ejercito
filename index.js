"use strict";

require("dotenv").config();
const Bot = require("./core/bot");

// Sistema Anti-Crash: Previene que el bot se apague por errores no controlados
process.on("unhandledRejection", (reason, promise) => {
    console.error("[ANTI-CRASH] ⚠️ Unhandled Rejection detectado:", reason);
});

process.on("uncaughtException", (err, origin) => {
    console.error("[ANTI-CRASH] ⚠️ Uncaught Exception detectado:", err);
});

const bot = new Bot();
bot.start();
