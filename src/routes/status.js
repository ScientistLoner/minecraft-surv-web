const { Router } = require('express');
const mcStatus = require('../services/mcStatus');
const { getOnlineHistory } = require('../queries/rawQueries');

const router = Router();

// Текущий статус — мгновенно из кэша (обновляется каждые 5 сек в фоне)
// ?fresh=1 — принудительно делает живую проверку прямо сейчас
// ?players=1 — включает список игроков онлайн
router.get('/', async (req, res) => {
  try {
    const fresh = req.query.fresh === '1';
    let status = fresh ? await mcStatus.forceCheck() : mcStatus.getStatus();

    const payload = { ...status };
    if (req.query.players !== '1') {
      delete payload.playerList;
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// История онлайна (raw SQL, последние 7 дней)
router.get('/history', async (req, res) => {
  try {
    const history = await getOnlineHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;