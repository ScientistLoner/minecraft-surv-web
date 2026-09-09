const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { sequelize, Player, Statistic } = require('../models');

const LOG_DIR = process.env.LOG_DIR || '/logs';
const STATS_DIR = process.env.STATS_DIR || '/world/stats';
const USERNAME_CACHE = process.env.USERNAME_CACHE || '/usercache.json';
const POLL_MS = parseInt(process.env.POLL_MS || '4000', 10);
const STATS_SYNC_MS = parseInt(process.env.STATS_SYNC_MS || '20000', 10);

const sessions = new Map();
const knownNicks = new Set();
const state = { lastTs: 0 };

// ---------- Разбор строк лога ----------

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function monthToNum(abbr) {
  const a = String(abbr).toLowerCase().replace('.', '').slice(0, 3);
  for (let i = 0; i < MONTHS.length; i++) {
    if (MONTHS[i].startsWith(a) || a.startsWith(MONTHS[i])) return i + 1;
  }
  return null;
}

const LOCAL_RE = /^\[(\d{2})([а-яА-Я]+)\.(\d{4}) (\d{2}):(\d{2}):(\d{2})\.(\d+)\]/;
const ISO_RE = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)\]/;

function parseTs(line) {
  let m = line.match(LOCAL_RE);
  if (m) {
    const mo = monthToNum(m[2]);
    if (!mo) return null;
    return new Date(+m[3], mo - 1, +m[1], +m[4], +m[5], +m[6], +m[7]).getTime();
  }
  m = line.match(ISO_RE);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]).getTime();
  return null;
}

const JOIN_RE = / ([A-Za-z0-9_]{1,16}) joined the game\s*$/;
const LEAVE_RE = / ([A-Za-z0-9_]{1,16}) left the game\s*$/;
const RESTART_RE = /Starting minecraft server|Preparing start region|Done \([0-9.]+s\)/;
const DEATH_RE = /^\[.+\] .*?: ([A-Za-z0-9_]{1,16}) (was slain|was shot|was pricked|walked into|drowned|suffocated|burned|was burnt|hit the ground|fell from|was blown|was killed|got finished|was squashed|was stomped|was pummelled|died|blew up)/;

// ---------- Работа с БД ----------

async function ensurePlayer(nick, uuid) {
  let p = await Player.findOne({ where: { username: nick } });
  if (!p) {
    p = await Player.create({ username: nick, uuid: uuid || null });
  }
  knownNicks.add(nick);
  return p;
}

async function onJoin(nick, ts, line) {
  const uuidMatch = line.match(/UUID of ([A-Fa-f0-9-]{32,36})/i);
  const player = await ensurePlayer(nick, uuidMatch ? uuidMatch[1] : null);
  await player.update({ last_seen: new Date(ts) });
  if (!sessions.has(nick)) {
    sessions.set(nick, { joinTs: ts });
  }
  console.log(`[Parser] JOIN ${nick}`);
}

async function onLeave(nick, ts) {
  const s = sessions.get(nick);
  sessions.delete(nick);
  let hours = 0;
  let firstJoin = null;
  if (s) {
    hours = Math.max(0, (ts - s.joinTs) / 3600000);
    firstJoin = new Date(s.joinTs);
  }
  const player = await ensurePlayer(nick, null);
  const upd = { last_seen: new Date(ts) };
  if (!player.joined_at) upd.joined_at = firstJoin;
  await player.update(upd);
  if (hours > 0) {
    await player.increment('hours_played', { by: hours });
  }
  console.log(`[Parser] LEAVE ${nick} +${hours.toFixed(2)}h`);
}

async function onDeath(nick, ts) {
  if (!knownNicks.has(nick)) return;
  const player = await ensurePlayer(nick, null);
  let st = await Statistic.findOne({ where: { player_id: player.id } });
  if (!st) st = await Statistic.create({ player_id: player.id });
  st.deaths += 1;
  await st.save();
  console.log(`[Parser] DEATH ${nick}`);
}

async function closeAllSessions(ts) {
  for (const nick of [...sessions.keys()]) {
    await onLeave(nick, ts);
  }
}

function handleLine(line) {
  const ts = parseTs(line);
  if (ts === null) return;

  if (ts > state.lastTs) {
    state.lastTs = ts;
  } else {
    return; // уже обработанная строка (защита от двойного подсчёта)
  }

  if (RESTART_RE.test(line)) {
    closeAllSessions(ts).catch((e) => console.error('[Parser] restart err', e.message));
    return;
  }

  const jm = line.match(JOIN_RE);
  if (jm) {
    onJoin(jm[1], ts, line).catch((e) => console.error('[Parser] join err', e.message));
    return;
  }

  const lm = line.match(LEAVE_RE);
  if (lm) {
    onLeave(lm[1], ts).catch((e) => console.error('[Parser] leave err', e.message));
    return;
  }

  const dm = line.match(DEATH_RE);
  if (dm) {
    onDeath(dm[1], ts).catch((e) => console.error('[Parser] death err', e.message));
    return;
  }
}

// ---------- Состояние парсера ----------

async function loadState() {
  try {
    const [rows] = await sequelize.query(
      "SELECT value FROM parser_state WHERE key = 'lastTs'"
    );
    if (rows.length) {
      state.lastTs = parseInt(rows[0].value, 10) || 0;
    }
  } catch (e) {
    await sequelize.query(
      "CREATE TABLE IF NOT EXISTS parser_state (key TEXT PRIMARY KEY, value TEXT)"
    );
  }
  // подгружаем уже известных игроков
  const players = await Player.findAll({ attributes: ['username'] });
  players.forEach((p) => knownNicks.add(p.username));
  console.log(`[Parser] state loaded, lastTs=${state.lastTs}, known=${knownNicks.size}`);
}

async function saveState() {
  await sequelize.query(
    "INSERT INTO parser_state (key, value) VALUES ('lastTs', :v) " +
    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    { replacements: { v: String(state.lastTs) } }
  );
}

// ---------- Чтение файлов ----------

function listLogFiles() {
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith('.log.gz') || f === 'latest.log');
  return files.filter((f) => f.endsWith('.log.gz')).sort().concat('latest.log');
}

async function processGz(file) {
  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(LOG_DIR, file)).pipe(zlib.createGunzip()),
      crlfDelay: Infinity
    });
    for await (const line of rl) {
      handleLine(line);
    }
  } catch (e) {
    console.error(`[Parser] gz skip ${file}: ${e.message}`);
  }
}

async function processPlain(file) {
  try {
    const txt = fs.readFileSync(path.join(LOG_DIR, file), 'utf8');
    for (const line of txt.split('\n')) {
      handleLine(line);
    }
  } catch (e) {
    console.error(`[Parser] plain skip ${file}: ${e.message}`);
  }
}

// ---------- Синхронизация официальной статистики из world/stats ----------

function loadUsernameCache() {
  try {
    const arr = JSON.parse(fs.readFileSync(USERNAME_CACHE, 'utf8'));
    const map = new Map();
    (Array.isArray(arr) ? arr : []).forEach((e) => {
      if (e && e.name && e.uuid) map.set(e.uuid.toLowerCase(), e.name);
    });
    return map;
  } catch (e) {
    return new Map();
  }
}

function sumValues(obj) {
  let total = 0;
  for (const k in obj || {}) total += +obj[k] || 0;
  return total;
}

const HOURS_PER_TICK = 1 / 72000; // 20 тиков/с * 3600 с/ч

async function syncStats() {
  try {
    const uidToName = loadUsernameCache();
    if (!uidToName.size) return;
    if (!fs.existsSync(STATS_DIR)) return;

    const files = fs.readdirSync(STATS_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
    const uuid = file.replace('.json', '').toLowerCase();
    const nick = uidToName.get(uuid);
    if (!nick) continue;

    try {
      const data = JSON.parse(fs.readFileSync(path.join(STATS_DIR, file), 'utf8'));
      const s = data.stats || {};
      const custom = s['minecraft:custom'] || {};

      const hours = Math.round(((custom['minecraft:play_time'] || 0) * HOURS_PER_TICK) * 100) / 100;
      const mobsKilled = custom['minecraft:mob_kills'] || sumValues(s['minecraft:killed']);
      const deaths = custom['minecraft:deaths'] || 0;
      const blocksBroken = sumValues(s['minecraft:mined']);
      const blocksPlaced = sumValues(s['minecraft:used']);
      const distanceCm = (custom['minecraft:walk_one_cm'] || 0)
        + (custom['minecraft:sprint_one_cm'] || 0)
        + (custom['minecraft:fly_one_cm'] || 0)
        + (custom['minecraft:swim_one_cm'] || 0)
        + (custom['minecraft:sneak_one_cm'] || 0)
        + (custom['minecraft:crouch_one_cm'] || 0)
        + (custom['minecraft:climb_one_cm'] || 0);
      const distanceM = Math.round((distanceCm / 100) * 10) / 10;

      const player = await ensurePlayer(nick, uuid);
      await player.update({ hours_played: hours, last_seen: new Date() });

      let st = await Statistic.findOne({ where: { player_id: player.id } });
      if (!st) st = await Statistic.create({ player_id: player.id });
      st.mobs_killed = mobsKilled;
      st.deaths = deaths;
      st.blocks_placed = blocksPlaced;
      st.blocks_broken = blocksBroken;
      st.distance_traveled = distanceM;
      await st.save();
    } catch (e) {
      console.error(`[Stats] skip ${file}: ${e.message}`);
    }
  }
  } catch (e) {
    console.error(`[Stats] sync failed: ${e.message}`);
  }
}

// ---------- Цикл ----------

async function backfill() {
  console.log('[Parser] backfill start');
  for (const file of listLogFiles()) {
    console.log(`[Parser] reading ${file}`);
    if (file.endsWith('.gz')) await processGz(file);
    else await processPlain(file);
  }
  await saveState();
  console.log(`[Parser] backfill done, lastTs=${state.lastTs}`);
}

async function tail() {
  if (!fs.existsSync(path.join(LOG_DIR, 'latest.log'))) return;
  await processPlain('latest.log');
  await saveState();
}

async function main() {
  await sequelize.authenticate();
  console.log('[Parser] DB connected');
  await loadState();
  await backfill();
  console.log('[Parser] tailing latest.log every ' + POLL_MS + 'ms');
  setInterval(tail, POLL_MS);
  console.log('[Parser] syncing world/stats every ' + STATS_SYNC_MS + 'ms');
  setInterval(() => syncStats().catch((e) => console.error('[Stats] interval error:', e.message)), STATS_SYNC_MS);
  syncStats().catch((e) => console.error('[Stats] sync error:', e.message));
}

main().catch((e) => {
  console.error('[Parser] fatal:', e);
  process.exit(1);
});