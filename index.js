require("dotenv").config();
const Bot = require("./core/bot");

const bot = new Bot();
bot.start();
