const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Недействительный или просроченный токен' });
  }
}

module.exports = { requireAuth };