const minioClient = require('./minioClient');
const express = require('express');
const app = express();
const sendToQueue = require('./rabbitMQ');

app.post('/upload/:type', async (req, res) => {
    const type = req.params.type;
    const file = req.body;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (type == 'entry') {
        const timeNow = Date.now();
        const fileName = `entry_${timeNow}.png`;
        // Image upload to minio
        try {
            await minioClient.putObject('entryPlates', fileName, file);
            console.log('Entry uploaded successfully');
            res.status(200).json({ message: 'File uploaded successfully' });
        } catch (error) {
            console.error('Error adding plate', error);
            res.status(500).json({ error: 'Error uploading file to MinIO' });
        }
        // Add task to RabbitMQ (ALPR check)
        const data = {type, fileName};
        sendToQueue(data);

        // Entry into MongoDB
    }
});

const port = 3000;
app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await ensureBucketExists();
});