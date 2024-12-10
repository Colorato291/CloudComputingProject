const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const name = 'parkingLot';
let cachedDB;

async function connectToDB() {
    if (chachedDB) return chachedDB

    const client = new MongoClient(url);
    await client.connect();
    console.log('Connection to DB created');
    cachedDB = client.cachedDB(name);
    return cachedDB;
}

module.exports = {
    connectToDB,
    getCollection: async (collectionName) => {
        const database = await connectToDatabase();
        return database.collection(collectionName);
    },
};