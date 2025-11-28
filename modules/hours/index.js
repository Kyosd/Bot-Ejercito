module.exports = {
    name: "hours",

    onLoad(bot) {
        this.service = require("./service");
        this.embeds = require("./embeds");
        this.admin = require("./admin");
        this.weekly = require("./weekly");
        this.ui = require("./ui");
    },

    deployUI(bot) {
        this.ui.deploy(bot);
    },

    handleButton(bot, interaction) {
        return this.ui.route(bot, interaction);
    },

    handleModal(bot, interaction) {
        return this.admin.handleModal(bot, interaction);
    },

    weeklyReport(bot, auto = false) {
        return this.weekly.generate(bot, auto);
    }
};
