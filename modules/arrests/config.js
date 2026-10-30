"use strict";

const coreConfig = require("../../core/config");

module.exports = {
    channel: process.env.CHANNEL_ARRESTS || coreConfig.channels.logs,
    infracciones: [
        
    ]
};

module.exports.labelFor = function labelFor(n) {
    const item = module.exports.infracciones.find(i => i.n === Number(n));
    return item ? `Art. ${item.n} - ${item.name}` : `Numeral ${n}`;
};
