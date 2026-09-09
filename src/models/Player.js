const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Player = sequelize.define('Player', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  uuid: { type: DataTypes.STRING(36) },
  joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  last_seen: { type: DataTypes.DATE },
  hours_played: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
  is_banned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'players',
  timestamps: false
});

module.exports = Player;
