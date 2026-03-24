const nodemailer = require('nodemailer');
const express = require('express');
const QRCode = require('qrcode');
const otpGenerator = require('otp-generator');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const otpStore = {};

// FIX: This tells Vercel to show your index.html when you visit the site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate QR and Send Email
app.post('/generate', async (req, res) => {
    const { userId, email } = req.body;
    const id = userId || 'Admin_User';
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl);

        if (email) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'ishbadhaikal@gmail.com', // Replace with your real email
                    pass: 'dxpcknjyhqpdfaze'     // Replace with your App Password
                }
            });

            await transporter.sendMail({
                from: '"MONG Secure Access" <ishbadhaikal@gmail.com>',
                to: email,
                subject: 'Your Access QR Code',
                text: `Hello ${id}, scan the attached QR code to receive your OTP.`,
                attachments: [{
                    filename: 'access-qr.png',
                    content: qrImage.split("base64,")[1],
                    encoding: 'base64'
                }]
            });
        }

        res.json({ otp, qrCode: qrImage, success: true });
    } catch (err) {
        console.error("System Error:", err);
        res.status(500).json({ error: "Operation failed", details: err.message });
    }
});

// Verify OTP
app.post('/verify', (req, res) => {
    const { userId, userOtp } = req.body;
    const id = userId || 'Admin_User';
    const record = otpStore[id];

    if (record && record.otp === userOtp) {
        delete otpStore[id];
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

module.exports = app;