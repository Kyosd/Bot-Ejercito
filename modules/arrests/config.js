"use strict";

const coreConfig = require("../../core/config");

module.exports = {
    channel: process.env.CHANNEL_ARRESTS || coreConfig.channels.logs,
    infracciones: [
        { n: 1, name: "Desacato a la autoridad militar" },
        { n: 2, name: "Porte ilegal de armas de fuego" },
        { n: 3, name: "Posesión de sustancias ilícitas / contrabando" },
        { n: 4, name: "Intrusión en zona militar restringida" },
        { n: 5, name: "Agresión física a funcionario en servicio" },
        { n: 6, name: "Robo / Hurto calificado" },
        { n: 7, name: "Fuga / Evasión de control militar" },
        { n: 8, name: "Tentativa de homicidio / Homicidio" },
        { n: 9, name: "Secuestro / Retención indebida" },
        { n: 10, name: "Conducción temeraria / Atropello" },
        { n: 11, name: "Amenazas / Extorsión" },
        { n: 12, name: "Terrorismo / Conspiración armada" },
        { n: 13, name: "Alteración del orden público" },
        { n: 14, name: "Obstrucción a la justicia" },
        { n: 15, name: "Suplantación de identidad / Uniforme militar" }
    ]
};

module.exports.labelFor = function labelFor(n) {
    const item = module.exports.infracciones.find(i => i.n === Number(n));
    return item ? `Art. ${item.n} - ${item.name}` : `Numeral ${n}`;
};
