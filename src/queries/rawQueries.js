const { sequelize } = require('../models');

const queries = {
  // Собираем сырые SQL запросы без ORM
  getTopPlayersRaw: (sortCol) => `
    SELECT p.username, p.hours_played,
           COALESCE(s.mobs_killed, 0) AS mobs_killed,
           COALESCE(s.deaths, 0) AS deaths,
           COALESCE(s.blocks_broken, 0) AS blocks_broken,
           COALESCE(s.blocks_placed, 0) AS blocks_placed,
           COALESCE(s.distance_traveled, 0) AS distance_traveled
    FROM players p
    LEFT JOIN statistics s ON s.player_id = p.id
    WHERE p.is_banned = false
    ORDER BY ${sortCol} DESC
    LIMIT :limit
  `,

  getServerStatsRaw: `
    SELECT COUNT(*) AS total_players,
           COALESCE(SUM(hours_played), 0) AS total_hours,
           COALESCE(SUM(CASE WHEN is_banned THEN 1 ELSE 0 END), 0) AS banned_count
    FROM players
  `,

  getRecentNewsRaw: `
    SELECT id, title, substring(content from 1 for 150) AS preview,
           author, published_at
    FROM news
    ORDER BY published_at DESC
    LIMIT :limit
  `,

  getOnlineHistoryRaw: `
    SELECT checked_at, players_online, max_players, online
    FROM server_status
    WHERE checked_at > NOW() - INTERVAL '7 days'
    ORDER BY checked_at ASC
  `
};

const SORT_COLUMNS = {
  hours: 'p.hours_played',
  kills: 's.mobs_killed',
  deaths: 's.deaths',
  blocks: 's.blocks_broken'
};

async function getTopPlayers(limit = 10, sort = 'hours') {
  const col = SORT_COLUMNS[sort] || SORT_COLUMNS.hours;
  const [results] = await sequelize.query(queries.getTopPlayersRaw(col), {
    replacements: { limit }
  });
  return results;
}

async function getServerStats() {
  const [results] = await sequelize.query(queries.getServerStatsRaw);
  return results[0];
}

async function getRecentNews(limit = 5) {
  const [results] = await sequelize.query(queries.getRecentNewsRaw, {
    replacements: { limit }
  });
  return results;
}

async function getOnlineHistory() {
  const [results] = await sequelize.query(queries.getOnlineHistoryRaw);
  return results;
}

module.exports = {
  queries,
  getTopPlayers,
  getServerStats,
  getRecentNews,
  getOnlineHistory
};
