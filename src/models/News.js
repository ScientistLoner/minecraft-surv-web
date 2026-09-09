const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const News = sequelize.define('News', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  author: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'Admin' },
  published_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'news',
  timestamps: false
});

module.exports = News;
