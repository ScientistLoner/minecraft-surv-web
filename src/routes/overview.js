const { Router } = require('express');
const { News, Rule } = require('../models');

const router = Router();

// Смешанные запросы: часть через ORM, часть через raw SQL
router.get('/overview', async (req, res) => {
  try {
    const { getServerStats, getRecentNews } = require('../queries/rawQueries');
    const stats = await getServerStats();
    const recentNews = await getRecentNews(3);

    res.json({ stats, recentNews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
