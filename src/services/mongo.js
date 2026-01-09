const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URL);

async function connectMongo() {
  await client.connect();
  return client.db("tasksdb");
}

module.exports = connectMongo;