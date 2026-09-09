require('dotenv').config();
const config = require('./config');
const { sendTelegramMessage } = require('./services/notify');

async function getChatId() {
  const token = config.telegram.token;
  if (!token) {
    console.error('TG_BOT_TOKEN не задан. Впиши его в .env');
    process.exit(1);
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const data = await res.json();
  if (!data.ok) {
    console.error('Ошибка Telegram API:', data.description);
    process.exit(1);
  }
  if (!data.result.length) {
    console.log('Нет обновлений.');
    console.log('1. Отправь сообщение своему боту в Telegram');
    console.log('2. Затем повтори: node src/telegram.js');
    process.exit(1);
  }
  const chats = new Map();
  data.result.forEach((u) => {
    const c = u.message && u.message.chat;
    if (c && !chats.has(c.id)) {
      chats.set(c.id, { id: c.id, who: c.username || c.first_name || '?' });
    }
  });
  chats.forEach((c) => console.log(`Chat ID: ${c.id}  (${c.who})`));
  console.log('Впиши этот Chat ID в .env как TG_CHAT_ID');
}

async function main() {
  if (process.argv[2] === 'test') {
    const ok = await sendTelegramMessage('✅ Бот работает! Сообщения с сайта будут приходить сюда.');
    console.log(ok ? 'Доставлено' : 'Не удалось отправить — проверь TG_BOT_TOKEN и TG_CHAT_ID');
    process.exit(ok ? 0 : 1);
  }
  await getChatId();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});