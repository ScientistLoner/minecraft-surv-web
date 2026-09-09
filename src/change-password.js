require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('./models');

async function main() {
  const username = process.argv[2];
  const newPassword = process.argv[3];
  if (!username || !newPassword) {
    console.error('Использование: node src/change-password.js <логин> <новый_пароль>');
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync(); // создаст таблицу admins, если её ещё нет

  const hash = await bcrypt.hash(newPassword, 10);
  const admin = await Admin.findOne({ where: { username } });

  if (admin) {
    await admin.update({ password_hash: hash });
    console.log(`Пароль обновлён для: ${username}`);
  } else {
    await Admin.create({ username, password_hash: hash, role: 'admin' });
    console.log(`Админ создан: ${username}`);
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});