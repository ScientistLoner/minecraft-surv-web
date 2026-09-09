const { status } = require('minecraft-server-util');
const config = require('../config');
const { ServerStatus } = require('../models');

let cached = {
  online: false,
  players_online: 0,
  max_players: 0,
  version: null,
  description: '',
  latency: null,
  checked_at: null,
  playerList: [],
  lastError: null,
  source: 'cache'
};

let lastPersist = 0;
let lastCheckTime = 0;
let inProgress = false;

function formatMotd(motd) {
  if (!motd) return '';
  if (typeof motd === 'string') return motd.replace(/§./g, '').trim();
  if (Array.isArray(motd)) return motd.join(' ').replace(/§./g, '').trim();
  if (typeof motd === 'object') {
    const clean = motd.clean;
    if (Array.isArray(clean)) return clean.join(' ').replace(/§./g, '').trim();
    if (typeof clean === 'string') return clean.replace(/§./g, '').trim();
    const text = motd.text || motd.toString?.() || '';
    return String(text).replace(/§./g, '').trim();
  }
  return String(motd).replace(/§./g, '').trim();
}

async function check() {
  if (inProgress) return;
  inProgress = true;
  lastCheckTime = Date.now();
  try {
    const result = await status(config.minecraft.host, config.minecraft.port, { timeout: 5000 });
    const players = result.players || {};

    cached = {
      online: true,
      players_online: players.online ?? 0,
      max_players: players.max ?? 0,
      version: result.version?.name || result.version?.toString?.() || 'unknown',
      description: formatMotd(result.motd),
      latency: result.roundTripLatency ?? null,
      checked_at: new Date(),
      playerList: Array.isArray(players.sample) ? players.sample : [],
      lastError: null,
      source: 'live'
    };

    persist(cached, true);
    console.log(`[Status] ONLINE ${cached.players_online}/${cached.max_players} ${cached.latency || 0}ms`);
  } catch (err) {
    cached = {
      online: false,
      players_online: 0,
      max_players: 0,
      version: null,
      description: '',
      latency: null,
      checked_at: new Date(),
      playerList: [],
      lastError: (err && (err.code || err.message)) || 'unreachable',
      source: 'live'
    };

    persist(cached, false);
    console.log(`[Status] OFFLINE: ${cached.lastError}`);
  } finally {
    inProgress = false;
  }
}

async function persist(sample, online) {
  const now = Date.now();
  if (now - lastPersist < 60000) return;
  lastPersist = now;
  try {
    await ServerStatus.create({
      online,
      players_online: sample.players_online,
      max_players: sample.max_players,
      version: sample.version,
      description: sample.description,
      latency: sample.latency,
      checked_at: sample.checked_at
    });
  } catch (e) {
    console.error('[Status] persist error:', e.message);
  }
}

async function forceCheck() {
  await check();
  return cached;
}

function ensureFresh() {
  if (!inProgress && Date.now() - lastCheckTime > 10000) {
    check();
  }
  return cached;
}

function getStatus() {
  if (!inProgress && (Date.now() - lastCheckTime > 10000)) {
    check();
  }
  return cached;
}

module.exports = { check, getStatus, ensureFresh, forceCheck, formatMotd };