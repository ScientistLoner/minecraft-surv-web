const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const ServerStatus = sequelize.define('ServerStatus', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  players_online: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  max_players: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20 },
  version: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT },
  latency: { type: DataTypes.INTEGER },
  checked_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'server_status',
  timestamps: false
});

module.exports = ServerStatus;
