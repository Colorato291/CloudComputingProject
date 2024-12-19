const MongoClient = require('mongodb').MongoClient;

// MongoDB adrese
const url = 'mongodb://221RDB026:password@MongoDB-db:27017';
const dbName = 'parkingLot';

let cachedDB; // Datubāzes savienojuma saglabāšana

async function connectToDB() {
    if (cachedDB) return cachedDB; // Ja savienojums jau ir, izmanto eksistējošo
    try {
        // Pretējā gadījumā izveido jaunu un saglabā to
        const client = new MongoClient(url);
        await client.connect();
        console.log('MongoDB: Connection to DB created');
        cachedDB = client.db(dbName);
        return cachedDB;
    } catch (error) {
        console.error('MongoDB: Error connecting to MongoDB:', error);
        throw error;
    }
}

// Kolekcijas izgūšana
async function getCollection(name) {
    const database = await connectToDB();
    return database.collection(name);
}
// Kolekcijas funkcijas eksportēšana
module.exports = getCollection;