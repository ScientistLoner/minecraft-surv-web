const config = require('../config');

async function sendTelegramMessage(text) {
  const { token, chatId } = config.telegram;
  if (!token) {
    console.warn('[TG] TG_BOT_TOKEN не задан');
    return false;
  }
  if (!chatId) {
    console.warn('[TG] TG_CHAT_ID не задан');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[TG] send error:', data.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[TG] send error:', e.message);
    return false;
  }
}

async function notifyNewMessage({ name, email, message }) {
  const text = [
    '📩 Новое сообщение с сайта MinecraftSurv',
    '',
    `👤 Имя: ${name}`,
    `✉️ Email: ${email || '—'}`,
    '',
    `💬 Сообщение:`,
    `${message}`
  ].join('\n');
  return sendTelegramMessage(text);
}

module.exports = { sendTelegramMessage, notifyNewMessage };