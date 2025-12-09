const mongoose = require('mongoose');
const { env } = require('../config/env');

mongoose.set('strictQuery', true);

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 15000
  });
  return mongoose.connection;
}

module.exports = { connectMongo, mongoose };

