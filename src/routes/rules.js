const { Router } = require('express');
const { Rule } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Список правил (ORM)
router.get('/', async (req, res) => {
  try {
    const rules = await Rule.findAll({ order: [['sort_order', 'ASC']] });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, sort_order } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    const rule = await Rule.create({ title, description, sort_order: sort_order || 0 });
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const { title, description, sort_order } = req.body;
    await rule.update({ title, description, sort_order });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const rule = await Rule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    await rule.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
