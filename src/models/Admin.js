const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(200), allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'admin' },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'admins',
  timestamps: false
});

module.exports = Admin;