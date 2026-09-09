const { Router } = require('express');
const { News } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Список новостей (ORM) — публично
router.get('/', async (req, res) => {
  try {
    const news = await News.findAll({ order: [['published_at', 'DESC']] });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создание новости — только админ
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title и content обязательны' });
    }
    const news = await News.create({ title, content, author: author || 'Admin' });
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Одна новость — публично
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление — только админ
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    const { title, content, author } = req.body;
    await news.update({ title, content, author });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление — только админ
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    await news.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;