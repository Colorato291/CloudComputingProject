const amqp = require('amqplib/callback_api');

// Connection caching
let connection;
let channel;
let queue = 'plateQueue';

async function connectToMQ() {
    if (connection && channel) return;

    try {
        connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();

        await channel.assertQueue(queue, { durable: true });

        console.log('RabbitMQ connected');
    } catch (error) {
        console.error('Error creating connection:', error);
    }
    
}

async function sendToQueue(message) {
    try {
        if (!channel || !connection) await connectToMQ();
        const data = JSON.stringify(message);
        channel.sendToQueue(queue, data, { persistent: true });
        console.log('Message sent to queue');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

module.exports = sendToQueue;