const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const { sequelize } = require('../../src/models');

describe('API (интеграция)', { concurrency: false }, () => {
  let server;
  let base;
  let dbOk = false;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });
    base = `http://127.0.0.1:${server.address().port}`;

    try {
      await sequelize.authenticate();
      dbOk = true;
    } catch {
      dbOk = false;
    }
  });

  after(async () => {
    if (server) server.close();
    await sequelize.close();
  });

  test('GET /api/health — метаданные API (без БД)', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, 'Minecraft Survival Server API');
    assert.ok(Array.isArray(body.endpoints));
    assert.ok(body.endpoints.includes('/api/health/db'));
  });

  test('GET /admin — страница админки отдаётся (без БД)', async () => {
    const res = await fetch(`${base}/admin`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Админ/);
  });

  test('POST /api/contact без полей → 400 (без БД)', async () => {
    const res = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'name, email и message обязательны');
  });

  test('GET /api/health/db — проверка соединения', async (t) => {
    if (!dbOk) return t.skip('Postgres недоступен — тест пропущен');
    const res = await fetch(`${base}/api/health/db`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  test('GET / — главная страница рендерится', async (t) => {
    if (!dbOk) return t.skip('Postgres недоступен — тест пропущен');
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /MinecraftSurv/);
  });

  test('GET /api/players/top — возвращает массив', async (t) => {
    if (!dbOk) return t.skip('Postgres недоступен — тест пропущен');
    const res = await fetch(`${base}/api/players/top?limit=10&sort=hours`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(await res.json()));
  });

  test('POST /api/contact — создание сообщения (нужен TEST_DB=1)', async (t) => {
    if (process.env.TEST_DB !== '1') return t.skip('Для записи в БД задайте TEST_DB=1');
    if (!dbOk) return t.skip('Postgres недоступен — тест пропущен');
    const res = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Тест', email: 'test@example.com', message: 'Привет из теста' })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id > 0);
    assert.equal(body.message, 'Привет из теста');
  });
});