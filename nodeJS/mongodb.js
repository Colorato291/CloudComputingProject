const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://221RDB026:password@MongoDB-db:27017';
const dbName = 'parkingLot';

let cachedDB;

async function connectToDB() {
    if (cachedDB) return cachedDB;

    const client = new MongoClient(url);
    await client.connect();
    console.log('MongoDB: Connection to DB created');
    cachedDB = client.db(dbName);
    await initCollections();
    return cachedDB;
}

async function initCollections() {
    const collections = await cachedDB.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    const requiredCollections = ['enteredVehicles', 'users']; // Example collection names

    for (const collectionName of requiredCollections) {
        if (!collectionNames.includes(collectionName)) {
            console.log(`Creating collection: ${collectionName}`);
            await cachedDB.createCollection(collectionName);
        }
    }
}

async function getCollection(name) {
    const database = await connectToDB();
    return database.collection(name);
}

module.exports = getCollection;