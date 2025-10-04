'use strict';
const path = require("path");
const fs = require("fs");
const { Sequelize } = require("sequelize");
const sequelize = require("../config/connectDB.js");

const db = {};
// Get current directory name (in CommonJS __dirname already exists)
const basename = path.basename(__filename);

// Read all files in this directory, excluding index.js
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    // For each file, require the model definition
    const model = require(path.join(__dirname, file));
    // And add it to the 'db' object
    db[model.name] = model;
  });

// Call the 'associate' method on each model if it exists
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Export the sequelize instance and the db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
