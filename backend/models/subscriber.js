const { Sequelize, DataTypes } = require('sequelize');

// Instead of creating a new Sequelize instance here, we should import it from a central configuration
// Assuming you have a db.js file that configures and exports the Sequelize instance
const sequelize = require('../db');

const Subscriber = sequelize.define('Subscriber', {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  firstname: {  // Add this field
    type: DataTypes.STRING,
    allowNull: true  // Set to false if you want it to be required
  },
  categories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },
  goal: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prompts: {
    type: DataTypes.TEXT,
    defaultValue: '[]'
  },
  lastPromptSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  timeZone: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'UTC'
  }
}, {
  tableName: 'Subscribers' // Explicitly set the table name
});

// Export the model
module.exports = { Subscriber };