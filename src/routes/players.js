const { Router } = require('express');
const { Player, Statistic } = require('../models');
const { getTopPlayers, getServerStats } = require('../queries/rawQueries');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Топ игроков (raw SQL)
router.get('/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const sort = req.query.sort || 'hours';
    const players = await getTopPlayers(limit, sort);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Статистика сервера (raw SQL агрегация)
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getServerStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Все игроки (ORM с join через include)
router.get('/', async (req, res) => {
  try {
    const players = await Player.findAll({
      include: [{ model: Statistic, as: 'Statistics', required: false }],
      order: [['hours_played', 'DESC']]
    });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Поиск игрока по имени
router.get('/:username', async (req, res) => {
  try {
    const player = await Player.findOne({
      where: { username: req.params.username },
      include: [{ model: Statistic, as: 'Statistics', required: false }]
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать игрока вручную — только админ
router.post('/', requireAuth, async (req, res) => {
  try {
    const { username, uuid } = req.body;
    if (!username) return res.status(400).json({ error: 'username обязателен' });
    const player = await Player.create({ username, uuid });
    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить игрока (бан, время и т.д.) — только админ
router.put('/:username', requireAuth, async (req, res) => {
  try {
    const player = await Player.findOne({ where: { username: req.params.username } });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const { uuid, hours_played, is_banned } = req.body;
    await player.update({ uuid, hours_played, is_banned });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить игрока — только админ
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const player = await Player.findByPk(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    await player.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
