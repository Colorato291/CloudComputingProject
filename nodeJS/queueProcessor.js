const amqp = require('amqplib');
const {minioClient} = require('./minio');
const analysePlate = require('./OpenALPR');
const getCollection = require('./mongodb');
const sendReciept = require('./MailHog');


// Connection caching
let connection;
let channel;
let queue = 'plateQueue';

const parkingRate = 2.5;

async function connectToMQ() {
    if (connection && channel) return;

    try {
        connection = await amqp.connect('amqp://RabbitMQ-queue:5672');
        channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });

        processQueue();
    } catch (error) {
        console.error('Error creating connection:', error);
    }
}

async function checkPlateInUsers(plate) {
    const userCollection = await getCollection('users');
    const document = await userCollection.findOne({ vehiclePlate: plate });
    return !!document;
}

async function moveToChecked(data) {
    await minioClient.copyObject(data.bucket, `checked/${data.fileName}`, `${data.bucket}/failed/${data.fileName}`);
    await minioClient.removeObject(data.bucket, `failed/${data.fileName}`);
}

async function handleEntry(plate, data) {
    const vehicleCollection = await getCollection('enteredVehicles');
    const vehicleExists = await vehicleCollection.findOne({ plateNumber: plate });
    if (vehicleExists) {
        console.error('Error: Vehicle already in parking lot');
    } else {
        await vehicleCollection.insertOne({
            plateNumber: plate,
            entryTime: data.timeNow,
            hasUser: await checkPlateInUsers(plate),
            paid: false
        });
    }
}

async function handleExit(plate, data) {
    const vehicleCollection = await getCollection('enteredVehicles');
    const document = await vehicleCollection.findOne({ plateNumber: plate });
    if (document) {
        const duration = Math.ceil((data.timeNow - document.entryTime) / (1000 * 60 * 60));
        if (document.hasUser) {
            const userCollection = await getCollection('users');
            const user = await userCollection.findOne({ vehiclePlate: plate });
            await sendReciept(user.email, `Thank you for using our services! Time spent: ${duration}h. Your account has been debited: $${duration * parkingRate}.`)
            await storeSession({vehicle: plate, entry: document.entryTime, exit: data.timeNow, duration: duration, cost: duration * parkingRate});
            await vehicleCollection.deleteOne({ _id: document._id });
        } else if (document.paid) {
            console.log('Thank you for using our services! Have a nice day!');
            await storeSession({vehicle: plate, entry: document.entryTime, exit: data.timeNow, duration: duration, cost: duration * parkingRate});
            await vehicleCollection.deleteOne({ _id: document._id });
        } else {
            console.log('Please pay at the machine before exiting!');
        }
    } else {
        console.log('No vehicle found in parking with plate ', plate);
    }
}

async function processQueue() {
    await channel.assertQueue(queue, { durable: true });

    console.log('RabbitMQ: Waiting for messages in queue:', queue);

    channel.consume(queue, async (message) => {
        try {
            const messageString = message.content.toString();
            const data = JSON.parse(messageString);
            console.log('RabbitMQ: Received plate to process:', data);
    
            const plate = await processPlate(data);
            console.log('OpenALPR: Plate processed');
            
            if (plate === null) {
                console.log('OpenALPR: No plate found');
            } else {
                console.log('OpenALPR: Plate found:', plate);
                await moveToChecked(data);
                if (data.bucket === 'entryplates') {
                    await handleEntry(plate, data);
                } else {
                    await handleExit(plate, data);
                }
            }
            // Acknowledge message
            channel.ack(message);
        } catch (error) {
            console.error('Error processing message:', error);
            // Acknowledge to prevent requeue of the same image
            channel.ack(message);
        }
    });
} 

async function storeSession(data){
    const sessionCollection = await getCollection('sessions');
    await sessionCollection.insertOne(data);
}

async function processPlate(data){
    const fileName = data['fileName'];
    const bucket = data['bucket'];
    try {
        const dataStream = await minioClient.getObject(bucket, `failed/${fileName}`);
        let imageData = Buffer.alloc(0);

        for await (const chunk of dataStream) {
            imageData = Buffer.concat([imageData, chunk]);
        }

        return await analysePlate(imageData);
    } catch (err) {
        console.error("Error during plate analysis:", err);
        return null;
    }
}

connectToMQ();