"use strict";

const RANK_HIERARCHY = [
    { name: "General", code: "☆Gral☆", level: 90, keywords: ["general", "gral"] },
    { name: "Coronel", code: "☆Col☆", level: 80, keywords: ["coronel", "col"] },
    { name: "Mayor", code: "☆My☆", level: 70, keywords: ["mayor", "my"] },
    { name: "Capitán", code: "☆Cap☆", level: 60, keywords: ["capitán", "capitan", "cap"] },
    { name: "Teniente", code: "☆Tte☆", level: 50, keywords: ["teniente", "tte"] },
    { name: "Sargento", code: "☆Sg☆", level: 40, keywords: ["sargento", "sgto", "sgt"] },
    { name: "Cabo", code: "☆C☆", level: 30, keywords: ["cabo"] },
    { name: "Soldado", code: "☆S☆", level: 20, keywords: ["soldado"] },
    { name: "Recluta", code: "☆R☆", level: 10, keywords: ["recluta"] }
];

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

const KNOWN_DIVISIONS = [
    { name: "Fuerzas Especiales", keywords: ["fuerzas especiales", "fuerza especial", "special forces", "ffee"] },
    { name: "Policía Militar", keywords: ["policía militar", "policia militar", "pm"] },
    { name: "Blindados", keywords: ["blindados", "caballería", "caballeria", "tanques"] },
    { name: "Fuerza Aérea", keywords: ["fuerza aérea", "fuerza aerea", "aviación", "aviacion", "piloto"] },
    { name: "Artillería", keywords: ["artillería", "artilleria"] },
    { name: "Sanidad Militar", keywords: ["sanidad", "médico", "medico", "paramédico", "paramedico"] },
    { name: "Logística", keywords: ["logística", "logistica", "abastecimiento"] },
    { name: "Infantería", keywords: ["infantería", "infanteria"] }
];

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function rankCodeFor(rank, fallback = "☆R☆") {
    if (!rank) return fallback;
    if (RANK_CODES[rank]) return RANK_CODES[rank];
    const key = Object.keys(RANK_CODES).find(k => k.toLowerCase() === String(rank).toLowerCase());
    return key ? RANK_CODES[key] : fallback;
}

/**
 * Resuelve automáticamente el rango más alto de un miembro según sus roles de Discord.
 */
function resolveMemberRank(member) {
    const fallback = { rank: "Recluta", code: "☆R☆", level: 10, role: null };
    if (!member || !member.roles?.cache) return fallback;

    const roles = Array.from(member.roles.cache.values());

    for (const item of RANK_HIERARCHY) {
        for (const role of roles) {
            const roleNameNorm = normalizeText(role.name);
            const matches = item.keywords.some(kw => {
                const kwNorm = normalizeText(kw);
                const regex = new RegExp(`(^|[\\s_\\-\\[\\](){}|/])${kwNorm}([\\s_\\-\\[\\](){}|/]|$)`, "i");
                return regex.test(roleNameNorm) || roleNameNorm === kwNorm;
            });

            if (matches) {
                return {
                    rank: item.name,
                    code: item.code,
                    level: item.level,
                    role
                };
            }
        }
    }

    return fallback;
}

/**
 * Resuelve la división táctica de un miembro según sus roles de Discord.
 */
function resolveMemberDivision(member, fallback = "Infantería") {
    if (!member || !member.roles?.cache) return fallback;
    const roles = Array.from(member.roles.cache.values());

    for (const div of KNOWN_DIVISIONS) {
        for (const role of roles) {
            const roleNameNorm = normalizeText(role.name);
            const matches = div.keywords.some(kw => {
                const kwNorm = normalizeText(kw);
                const regex = new RegExp(`(^|[\\s_\\-\\[\\](){}|/])${kwNorm}([\\s_\\-\\[\\](){}|/]|$)`, "i");
                return regex.test(roleNameNorm) || roleNameNorm.includes(kwNorm);
            });

            if (matches) {
                return div.name;
            }
        }
    }

    return fallback;
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

module.exports = {
    RANK_HIERARCHY,
    RANK_CODES,
    KNOWN_DIVISIONS,
    rankCodeFor,
    resolveMemberRank,
    resolveMemberDivision,
    buildNickname
};
