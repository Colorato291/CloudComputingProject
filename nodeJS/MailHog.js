const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'mailhog-smtp',
    port: 1025,
    secure: false,
});

async function sendReciept(recipient, text) {
    await transporter.sendMail({
        from: '"Parking" <parking@coolcat-dev.com>',
        to: recipient,
        subject: 'Parking receipt',
        text: text,
    });
}

module.exports = sendReciept;