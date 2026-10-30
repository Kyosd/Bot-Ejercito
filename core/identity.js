"use strict";

const RANK_CODES = {
    Recluta: "☆R☆",
    Soldado: "☆S☆",
    Cabo: "☆C☆",
    Sargento: "☆Sg☆",
    Teniente: "☆Tte☆",
    Capitán: "☆Cap☆",
    Capitan: "☆Cap☆",
    Mayor: "☆My☆",
    Coronel: "☆Col☆",
    General: "☆Gral☆"
};

function rankCodeFor(rank, fallback = "☆R☆") {
    if (!rank) return fallback;
    if (RANK_CODES[rank]) return RANK_CODES[rank];
    const key = Object.keys(RANK_CODES).find(k => k.toLowerCase() === String(rank).toLowerCase());
    return key ? RANK_CODES[key] : fallback;
}

function buildNickname(plate, displayName, rankCode) {
    const platePart = `[${plate}]`;
    const code = rankCode || "☆R☆";
    const extra = ` ${code}`;
    let name = String(displayName || "Soldado").replace(/\s+/g, " ").trim();
    const reserved = platePart.length + 1 + extra.length;
    const maxName = Math.max(1, 32 - reserved);
    if (name.length > maxName) name = name.slice(0, maxName).trim();
    return `${platePart} ${name}${extra}`.slice(0, 32);
}

module.exports = { RANK_CODES, rankCodeFor, buildNickname };
