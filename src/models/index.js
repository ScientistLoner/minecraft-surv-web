const sequelize = require('./sequelize');

const News = require('./News');
const Rule = require('./Rule');
const ServerStatus = require('./ServerStatus');
const Player = require('./Player');
const Statistic = require('./Statistic');
const Admin = require('./Admin');

module.exports = {
  sequelize,
  News,
  Rule,
  ServerStatus,
  Player,
  Statistic,
  Admin
};
