const nodemailer = require('nodemailer');

// nodemailer transportētāja definēšana
const transporter = nodemailer.createTransport({
    host: 'mailhog-smtp', // SMTP serveris - mailhog
    port: 1025,
    secure: false,
});

// Funkcija e-pasta nosūtīšanai
async function sendReciept(recipient, text) {
    await transporter.sendMail({
        from: '"Parking" <parking@coolcat-dev.com>',
        to: recipient,
        subject: 'Parking receipt',
        text: text,
    });
}
// Funkcijas eksportēšana
module.exports = sendReciept;