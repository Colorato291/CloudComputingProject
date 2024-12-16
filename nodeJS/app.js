const {minioClient, checkBuckets}  = require('./minio');
const multer = require('multer');
const sendToQueue = require('./rabbitMQ');
const path = require('path');
const getCollection = require('./mongodb');

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost',
    credentials: true
}));
app.use(express.json());
app.options('*', cors());

const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

app.post('/upload/:type', upload.single('file'), async (req, res) => {
    const type = req.params.type;
    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (type == 'entry') {
        const timeNow = Date.now();
        const fileName = `entry_${timeNow}.${fileExtension}`;
        const bucket = 'entryplates'
        // Image upload to minio
        try {
            await minioClient.putObject(bucket, `failed/${fileName}`, file.buffer);
            console.log('MinIO: Plate stored successfully');
            res.status(200).json({ message: 'File uploaded successfully' });

            // Add task to RabbitMQ (ALPR check)
            const data = {bucket, fileName, timeNow};
            sendToQueue(data);
        } catch (error) {
            console.error('Error adding plate', error);
            res.status(500).json({ error: 'Error uploading file to MinIO' });
        }
    } else {
        const timeNow = Date.now();
        const fileName = `exit_${timeNow}.${fileExtension}`;
        const bucket = 'exitplates'
        // Image upload to minio
        try {
            await minioClient.putObject(bucket, `failed/${fileName}`, file.buffer);
            console.log('MinIO: Plate stored successfully');
            res.status(200).json({ message: 'File uploaded successfully' });

            // Add task to RabbitMQ (ALPR check)
            const data = {bucket, fileName, timeNow};
            sendToQueue(data);
        } catch (error) {
            console.error('Error adding plate', error);
            res.status(500).json({ error: 'Error uploading file to MinIO' });
        }
    }
});

app.post('/newuser', async (req, res) => {
    const {data} = req.body;
    const userCollection = await getCollection('users');
    let user = await userCollection.findOne({ email: data.email });
    if (user) {
        return res.status(400).json({ error: 'User already exists' });
    }
    user = await userCollection.findOne({ vehiclePlate: data.vehiclePlate });
    if (user) {
        return res.status(400).json({ error: 'Vehicle already registered to another user' });
    }
    await userCollection.insertOne(data);
    res.status(200).json({ message: 'User added successfully' });
});

app.post('/pay', async (req, res) => {
    const {plate} = req.body;
    if (!plate) {
        return res.status(400).json({ error: 'License plate is required' });
    }
    const vehicleCollection = await getCollection('enteredVehicles');
    const result = await vehicleCollection.updateOne({plateNumber: plate}, {$set:{ paid: true }});

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Parking paid successfully' });
});

const port = 3000;

app.listen(port, async () => {
    console.log(`NodeJS: Server running at http://localhost:${port}`);
    checkBuckets();
});