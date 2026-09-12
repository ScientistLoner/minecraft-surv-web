const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { requireAuth } = require('../../src/middleware/auth');
const config = require('../../src/config');

function fakeRes() {
  const res = {
    statusCode: 200,
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.sent = data;
    }
  };
  return res;
}

function call(header) {
  const req = { headers: header ? { authorization: header } : {} };
  const res = fakeRes();
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
}

test('без заголовка Authorization → 401', () => {
  const { res, nextCalled } = call(null);
  assert.equal(res.statusCode, 401);
  assert.equal(res.sent.error, 'Не авторизован');
  assert.equal(nextCalled, false);
});

test('неправильный формат заголовка → 401', () => {
  const { res } = call('Token abc');
  assert.equal(res.statusCode, 401);
  assert.equal(res.sent.error, 'Не авторизован');
});

test('недействительный токен → 401', () => {
  const { res } = call('Bearer not-a-jwt');
  assert.equal(res.statusCode, 401);
  assert.equal(res.sent.error, 'Недействительный или просроченный токен');
});

test('валидный токен → next() и req.user', () => {
  const token = jwt.sign({ id: 1, username: 'admin' }, config.jwt.secret);
  const { req, res, nextCalled } = call(`Bearer ${token}`);
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 1);
  assert.equal(req.user.username, 'admin');
});

test('токен, подписанный чужим секретом → 401', () => {
  const token = jwt.sign({ id: 1 }, 'another-secret');
  const { res, nextCalled } = call(`Bearer ${token}`);
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});