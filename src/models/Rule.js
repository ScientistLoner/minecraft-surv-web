const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Rule = sequelize.define('Rule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'rules',
  timestamps: false
});

module.exports = Rule;
