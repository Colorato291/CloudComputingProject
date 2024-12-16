const amqp = require('amqplib');

// Connection caching
let connection;
let channel;
let queue = 'plateQueue';

async function connectToMQ() {
    if (connection && channel) return;

    try {
        connection = await amqp.connect('amqp://RabbitMQ-queue:5672');
        channel = await connection.createChannel();

        await channel.assertQueue(queue, { durable: true });

        console.log('RabbitMQ: Connected to queue');
    } catch (error) {
        console.error('Error creating connection:', error);
    }
}

async function sendToQueue(inputData) {
    try {
        if (!channel || !connection) await connectToMQ();
        const data = JSON.stringify(inputData);
        channel.sendToQueue(queue, Buffer.from(data), { persistent: true });
        console.log('RabbitMQ: Message sent to queue');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

module.exports = sendToQueue;