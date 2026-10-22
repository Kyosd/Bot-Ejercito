"use strict";

function toInt(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function minutesToHM(minutes) {
  minutes = Math.trunc(toInt(minutes, 0));
  const isNegative = minutes < 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return { h, m, isNegative, text: `${isNegative ? "-" : ""}${h}h ${m}m` };
}

function ts(ms, style = "F") {
  const unix = Math.floor(toInt(ms, Date.now()) / 1000);
  return `<t:${unix}:${style}>`;
}

function rel(ms) {
  const unix = Math.floor(toInt(ms, Date.now()) / 1000);
  return `<t:${unix}:R>`;
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (_) {}
}

module.exports = { toInt, minutesToHM, ts, rel, safeReply };
