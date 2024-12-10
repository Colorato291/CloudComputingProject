const amqp = require('amqplib');
const minioClient = require('./minioClient');

async function processQueue() {
    const queue = 'defaultQueue';
    const url = 'amqp://localhost';

    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    console.log('Waiting for messages in queue:', queue);

    channel.consume(queue, (message) => {
        const data = JSON.stringify(message.content.toString());
        console.log('Recieved plate:', data);
        processPlate(data);
    });
}

async function processPlate(data){
    const fs = require('fs');
    const fileName = data['fileName'];
    const bucket = data['type'] === 'entry' ? 'entryPlates' : 'exitPlates';
    minioClient.getObject(bucket, `${fileName}.png`, function(err, dataStream) {
        if (err) {
            return console.log(err);
        }

        let imageData = Buffer.alloc(0);

        dataStream.on('data', function(chunk) {
            imageData = Buffer.concat([imageData, chunk]);
        });

        dataStream.on('end', function() {
            console.log('Image downloaded successfully');
            // Now you can use imageData as your image file in a Node.js variable
        });

        dataStream.on('error', function(err) {
            console.log(err);
        });
    });
}

processQueue();