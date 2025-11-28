const config = require("./config");

module.exports = {
    start(bot) {
        setInterval(async () => {
            const now = new Date();

            if (
                now.getDay() === config.hours.resetDay &&
                now.getHours() === config.hours.resetHour &&
                now.getMinutes() === config.hours.resetMinute
            ) {
                await bot.modules.hours.weeklyReport(bot, true);
            }

        }, 60 * 1000);
    }
};
