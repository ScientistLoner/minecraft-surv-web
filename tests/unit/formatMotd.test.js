const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatMotd } = require('../../src/services/mcStatus');

test('строка с §-кодами очищается', () => {
  assert.equal(formatMotd('§aGreen Server'), 'Green Server');
});

test('пустая строка', () => {
  assert.equal(formatMotd(''), '');
});

test('массив склеивается через пробел', () => {
  assert.equal(formatMotd(['§6Welcome', '§rto', '§fSurv']), 'Welcome to Surv');
});

test('объект с clean-полем', () => {
  assert.equal(formatMotd({ clean: ['a', 'b'] }), 'a b');
});

test('объект с текстом внутри', () => {
  assert.equal(formatMotd({ text: '§eHello' }), 'Hello');
});

test('число приводится к строке', () => {
  assert.equal(formatMotd(123), '123');
});

test('null и undefined дают пустую строку', () => {
  assert.equal(formatMotd(null), '');
  assert.equal(formatMotd(undefined), '');
});