const { Router } = require('express');
const { sequelize } = require('../models');

const router = Router();

// Healthcheck БД
router.get('/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', message: 'Database connection successful' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Общая информация
router.get('/', (req, res) => {
  res.json({
    name: 'Minecraft Survival Server API',
    version: '1.0.0',
    endpoints: [
      '/api/status',
      '/api/news',
      '/api/news/:id',
      '/api/rules',
      '/api/players/top',
      '/api/players/statistics',
      '/api/stats/server',
      '/api/contact',
      '/api/health/db'
    ]
  });
});

module.exports = router;
