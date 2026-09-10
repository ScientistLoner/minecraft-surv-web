const { Router } = require('express');
const { sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Отправка сообщения — публично (raw SQL INSERT)
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email и message обязательны' });
    }
    const [result] = await sequelize.query(
      'INSERT INTO contact_messages (name, email, message) VALUES (:name, :email, :message) RETURNING *',
      { replacements: { name, email, message } }
    );
    res.status(201).json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Список сообщений — только админ
router.get('/', requireAuth, async (req, res) => {
  try {
    const [messages] = await sequelize.query(
      'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC'
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление сообщения — только админ
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await sequelize.query('DELETE FROM contact_messages WHERE id = :id', {
      replacements: { id: req.params.id }
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;