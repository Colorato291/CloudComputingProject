// Funkciju importēšana
const amqp = require('amqplib');
const {minioClient} = require('./minio');
const analysePlate = require('./OpenALPR');
const getCollection = require('./mongodb');
const sendReceipt = require('./MailHog');

// Savienojumu saglabāšana
let connection;
let channel;
let queue = 'plateQueue';

const parkingRate = 2.5; // Tarifs stundā

async function connectToMQ() { // RabbitMQ savienojuma izveide
    if (connection && channel) return; // Ja jau pastāv savienojums, izmanto to

    try {
        connection = await amqp.connect('amqp://RabbitMQ-queue:5672');
        channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });
        processQueue(); // Rindas apstrāde
    } catch (error) {
        console.error('Error creating connection:', error);
    }
}

// Funkcija, lai pārbaudītu vai iebraucošai mašīnai ir reģistrēts lietotājs
async function checkPlateInUsers(plate) {
    const userCollection = await getCollection('users');
    const document = await userCollection.findOne({ vehiclePlate: plate });
    return !!document;
}

// Funkcija, lai pārnestu MinIO failu no failed uz checked
async function moveToChecked(data) {    // Failu pārkopē un izdzēš
    await minioClient.copyObject(data.bucket, `checked/${data.fileName}`, `${data.bucket}/failed/${data.fileName}`);
    await minioClient.removeObject(data.bucket, `failed/${data.fileName}`);
}

// Iebraukšanas apstrāde
async function handleEntry(plate, data) {
    // Iegūst datubāzu kolekcijas
    const vehicleCollection = await getCollection('enteredVehicles');
    const vehicleExists = await vehicleCollection.findOne({ plateNumber: plate });
    if (vehicleExists) { // Ja mašīna jau ir stāvlaukumā, atgriež kļūdu
        console.error('Error: Vehicle already in parking lot');
    } else {    // Pretēja gadījumā ievieto to pie stāvlaukuma mašīnām
        await vehicleCollection.insertOne({
            plateNumber: plate,
            entryTime: data.timeNow,
            hasUser: await checkPlateInUsers(plate),
            paid: false
        });
    }
}

// Izbraukšanas apstrāde
async function handleExit(plate, data) {
    const vehicleCollection = await getCollection('enteredVehicles'); // MongoDB kolekcijas iegūšana
    const document = await vehicleCollection.findOne({ plateNumber: plate }); // Iegūst attiecīgo ierakstu
    if (document) { // Ja ieraksts pastāv
        const duration = Math.ceil((data.timeNow - document.entryTime) / (1000 * 60 * 60)); // Aprēķina stāvēšanas ilgumu
        if (document.hasUser) { // Ja automašīnai ir reģistrēts lietotājs
            // Iegūst attiecīgo lietotāju
            const userCollection = await getCollection('users');
            const user = await userCollection.findOne({ vehiclePlate: plate });
            // Nosūta e-pastu
            await sendReceipt(user.email, `Thank you for using our services! Time spent: ${duration}h. Your account has been debited: $${duration * parkingRate}.`)
            // Saglabā stāvēšanas sesiju
            await storeSession({vehicle: plate, entry: document.entryTime, exit: data.timeNow, duration: duration, cost: duration * parkingRate});
            // Izdzēš automašīnu no stāvvietā esošajām automašīnām
            await vehicleCollection.deleteOne({ _id: document._id });
        } else if (document.paid) { // Nav lietotājs, bet ir apmaksāts
            console.log('Thank you for using our services! Have a nice day!');
            // Saglabā stāvēšanas sesiju
            await storeSession({vehicle: plate, entry: document.entryTime, exit: data.timeNow, duration: duration, cost: duration * parkingRate});
            // Izdzēš automašīnu no stāvvietā esošajām automašīnām
            await vehicleCollection.deleteOne({ _id: document._id });
        } else { // Nav lietotājs un nav samaksāts: ziņojums, ka jāsamaksā pie automāta
            console.log('Please pay at the machine before exiting!');
        }
    } else { // Ja automašīna nav atrasta stāvlaukumā
        console.log('No vehicle found in parking with plate ', plate);
    }
}

// Funkcija sesijas saglabāšanai MongoDB
async function storeSession(data){
    const sessionCollection = await getCollection('sessions');
    await sessionCollection.insertOne(data);
}

// Funkcija saņemtās numurzīmes apstrādei
async function processPlate(data){
    // Iegūst faila nosaukumu
    const fileName = data['fileName'];
    // Iegūst faila MinIO bucket
    const bucket = data['bucket'];
    try {
        // Iegūst attēlu no MinIO
        const dataStream = await minioClient.getObject(bucket, `failed/${fileName}`);
        // Iegūto attēlu saglabā atmiņas buferī
        let imageData = Buffer.alloc(0);
        for await (const chunk of dataStream) {
            imageData = Buffer.concat([imageData, chunk]);
        }

        // Nosūta uz analīzi
        return await analysePlate(imageData);
    } catch (err) {
        console.error("Error during plate analysis:", err);
        return null;
    }
}

// Funkcija rindas apstrādei
async function processQueue() {
    // Gaida ziņas rindā
    await channel.assertQueue(queue, { durable: true });
    console.log('RabbitMQ: Waiting for messages in queue:', queue);
    // Saņemot ziņu
    channel.consume(queue, async (message) => {
        try {
            // Iegūst datus par apstrādājamo numurzīmi
            const messageString = message.content.toString();
            const data = JSON.parse(messageString);
            console.log('RabbitMQ: Received plate to process:', data);
            // Veic numurzīmes analīzi
            const plate = await processPlate(data);
            console.log('OpenALPR: Plate processed');
            
            if (plate === null) { // Ja saņemts null, tad ir notikusi kļūda ar ALPR vai ALPR nav atradis numurzīmi
                console.log('OpenALPR: No plate found');
            } else { // Pretējā gadījumā izvada numurzīmi
                console.log('OpenALPR: Plate found:', plate);
                // Numurzīmi pārvieto uz pārbaudīto numurzīmju mapi
                await moveToChecked(data);
                // Veic apstrādi atkarība no tā vai ir iebraukšana vai izbraukšana
                if (data.bucket === 'entryplates') {
                    await handleEntry(plate, data);
                } else {
                    await handleExit(plate, data);
                }
            }
            // Apstiprina ziņas apstrādi
            channel.ack(message);
        } catch (error) {
            console.error('Error processing message:', error);
            // Arī pie kļūdas apstiprina ziņas apstrādi, lai ziņa vēlreiz nenonāktu rindā,
            // jo atkārtota tās pašas bildes apstrāde ALPR rezultātus nemainīs.
            channel.ack(message);
        }
    });
} 

// Izveido savienojumu ar RabbitMQ
connectToMQ();