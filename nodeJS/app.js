// Importēšana
const {minioClient, checkBuckets}  = require('./minio');
const multer = require('multer');
const sendToQueue = require('./rabbitMQ');
const path = require('path');
const getCollection = require('./mongodb');

// Express un CORS inicializācija
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost',
    credentials: true
}));
app.use(express.json());
app.options('*', cors());

const storage = multer.memoryStorage(); // Failu uzglabāšana atmiņā
const upload = multer({ storage: storage });

// Galapunkts faila augšupielādei
app.post('/upload/:type', upload.single('file'), async (req, res) => {
    const type = req.params.type;   // Tips (iebraukšana/izbraukšana)
    const file = req.file;          // Fails
    const fileExtension = path.extname(file.originalname);  // Faila tips (jpeg/png/...)
    if (!file) {    // Ja fails nav augšupielādēts (dubultpārbaude)
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const timeNow = Date.now();         // Pašreizējais laiks
    const isEntry = type === 'entry';   // Boolean vai ir iebraukšana
    
    const bucket = isEntry ? 'entryplates' : 'exitplates'; // MinIO bucket
    // Faila nosaukums formātā (tips_laiks.paplašinājums)
    const fileName = `${isEntry ? 'entry' : 'exit'}_${timeNow}.${fileExtension}`;

    try {
        // Augšupielāde uz MinIO zem failed mapes
        await minioClient.putObject(bucket, `failed/${fileName}`, file.buffer);
        console.log('MinIO: Plate stored successfully');
        
        // Nosūtīšana uz RabbitMQ
        const data = { bucket, fileName, timeNow };
        sendToQueue(data);
        // Ziņojums par veiksmīgu augšupielādi
        res.status(200).json({ message: 'File uploaded successfully' });
    } catch (error) { // Kļūdas apstrāde
        console.error('Error adding plate:', error);
        res.status(500).json({ error: 'Error uploading file to MinIO' });
    }
});

// Galapunkts jauna lietotāja pievienošanai
app.post('/newuser', async (req, res) => {
    const {data} = req.body;    // Datu izgūšana no pieprasījuma
    const userCollection = await getCollection('users'); // Kolekcijas izgūšana no MongoDB
    let user = await userCollection.findOne({ email: data.email }); // Pārbaude vai ir lietotājs ar tādu pašu e-pastu (uzskata, ka e-pasti ir unikāli)
    if (user) {
        return res.status(400).json({ error: 'User already exists' });
    }
    user = await userCollection.findOne({ vehiclePlate: data.vehiclePlate }); // Pārbaude vai ir lietotājs ar tādu pašu auto (uzskata, ka 1 auto ir 1 lietotājam)
    if (user) {
        return res.status(400).json({ error: 'Vehicle already registered to another user' });
    }
    await userCollection.insertOne(data); // Datu ievietošana kolekcijā
    res.status(200).json({ message: 'User added successfully' });
});

// Galapunkts apmaksai no automāta
app.post('/pay', async (req, res) => {
    const {plate} = req.body; // Numurzīmes izgūšana no pieprasījuma
    if (!plate) {   // Ja nekas nav pievienots
        return res.status(400).json({ error: 'License plate is required' });
    }
    // Iegūst MongoDB stāvlaukumā esošo auto kolekciju
    const vehicleCollection = await getCollection('enteredVehicles');
    // Nomaina apmaksas stāvokli uz true
    const result = await vehicleCollection.updateOne({plateNumber: plate}, {$set:{ paid: true }});
    if (result.matchedCount === 0) { // Ja nav attiecīgās automašīnas
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Parking paid successfully' });
});

// Express palaišana
const port = 3000;
app.listen(port, async () => {
    console.log(`NodeJS: Server running at http://localhost:${port}`);
    checkBuckets(); // Pārbaude, vai eksistē nepieciešamie MinIO bucket
});