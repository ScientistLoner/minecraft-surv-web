require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const { sequelize } = require('./models');
const mcStatus = require('./services/mcStatus');

const app = express();
const PORT = config.port;
const HOST = config.host;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Роуты API
app.use('/api', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/status', require('./routes/status'));
app.use('/api/news', require('./routes/news'));
app.use('/api/rules', require('./routes/rules'));
app.use('/api/players', require('./routes/players'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/overview', require('./routes/overview'));

// Админ-панель
app.get('/admin', (req, res) => {
  res.render('admin', { title: 'Админ-панель' });
});

// Главная страница
app.get('/', async (req, res) => {
  try {
    const { News, Rule } = require('./models');
    const status = mcStatus.getStatus();
    const news = await News.findAll({ order: [['published_at', 'DESC']], limit: 5 });
    const rules = await Rule.findAll({ order: [['sort_order', 'ASC']] });
    res.render('index', {
      title: 'MinecraftSurv',
      status,
      news,
      rules,
      mcHost: config.minecraft.host,
      mcPort: config.minecraft.port,
      config_tg: config.contactTelegram
    });
  } catch (err) {
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// Проверка при старте
mcStatus.check();

// Фоновая проверка каждые 5 секунд — статус почти мгновенный
setInterval(mcStatus.check, 5000);

// Запуск
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to database:', err);
    process.exit(1);
  }
}

start();