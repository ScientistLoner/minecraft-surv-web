require('dotenv').config();
const config = require('./config');
const { sequelize } = require('./models');
const mcStatus = require('./services/mcStatus');
const app = require('./app');

const PORT = config.port;
const HOST = config.host;

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