// db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: console.log // This will log all Sequelize queries
});

module.exports = sequelize;