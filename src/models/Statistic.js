const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const Player = require('./Player');

const Statistic = sequelize.define('Statistic', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  player_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Player, key: 'id' } },
  mobs_killed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  deaths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  blocks_placed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  blocks_broken: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  distance_traveled: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'statistics',
  timestamps: false
});

Statistic.belongsTo(Player, { foreignKey: 'player_id' });
Player.hasMany(Statistic, { foreignKey: 'player_id' });

module.exports = Statistic;
