require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Rule, ServerStatus, Player, Statistic, News, Admin } = require('./models');

const rules = [
  { title: 'Читы', description: 'Запрещены любые модификации, дающие преимущество: хак-клиенты, X-ray, автокликеры и т.д.', sort_order: 1 },
  { title: 'Уважение', description: 'Уважайте других игроков. Чрезмерные оскорбления, токсичность и дискриминация не допускаются.', sort_order: 2 },
  { title: 'Реклама', description: 'Запрещена реклама сторонних серверов и ресурсов в чате и в личных сообщениях.', sort_order: 3 },
  { title: 'Спам', description: 'Не спамите в чат. Чрезмерный спам может привести к временной замуте.', sort_order: 4 }
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    if (await Rule.count() === 0) {
      await Rule.bulkCreate(rules);
      console.log('Rules seeded');
    }

    // Создаём администратора (если его ещё нет)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    const existing = await Admin.findOne({ where: { username: adminUsername } });
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await Admin.create({ username: adminUsername, password_hash: hash, role: 'admin' });
      console.log(`Admin created: ${adminUsername} / ${adminPassword}  (СМЕНИ ПАРОЛЬ!)`);
    } else {
      console.log(`Admin exists: ${adminUsername}`);
    }

    // Игроки/новости/статистика теперь заполняются парсером логов автоматически.
    console.log('Seed done. Real player data собирается парсером логов.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await sequelize.close();
  }
}

seed();