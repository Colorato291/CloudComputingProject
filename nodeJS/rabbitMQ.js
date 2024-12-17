const amqp = require('amqplib');

// Savienojuma saglabāšana
let connection;
let channel;
let queue = 'plateQueue';

// Savienojuma izveide ar RabbitMQ
async function connectToMQ() {
    if (connection && channel) return; // Ja jau pastāv savienojums, izmanto to
    try {
        connection = await amqp.connect('amqp://RabbitMQ-queue:5672');
        channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });
        console.log('RabbitMQ: Connected to queue');
    } catch (error) {
        console.error('Error creating connection:', error);
    }
}

// Funkcija ziņas nosūtīšanai rindā
async function sendToQueue(inputData) {
    try {
        if (!channel || !connection) await connectToMQ(); // Ja nav savienojums, to izveido (dublē savienojuma pārbaudi zem connectToMQ())
        const data = JSON.stringify(inputData); // Datus pārveido par JSON
        channel.sendToQueue(queue, Buffer.from(data), { persistent: true }); // Rindā iesūta buferi ar datiem
        console.log('RabbitMQ: Message sent to queue');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
// Funkcijas eksportēšana
module.exports = sendToQueue;