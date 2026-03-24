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

app.post('/generate', async (req, res) => {
    const { userId, email } = req.body;
    const id = userId || 'Admin_User';
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl);

        // Only try to send email if an email address was provided
        if (email) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'ishbadhaikal@gmail.com', 
                    pass: 'dxpc knjy hqpd faze' 
                }
            });

            await transporter.sendMail({
                from: '"MONG Secure Access" <YOUR_ACTUAL_GMAIL@gmail.com>',
                to: email,
                subject: 'Your Access QR Code',
                text: `Hello ${id}, your OTP is ${otp}. Scan the attached QR to verify.`,
                attachments: [{
                    filename: 'access-qr.png',
                    content: qrImage.split("base64,")[1],
                    encoding: 'base64'
                }]
            });
        }

        res.json({ otp, qrCode: qrImage, success: true });
    } catch (err) {
        console.error("Server Error:", err);
        // We return a 500 JSON error instead of letting the function crash
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

// Verification route
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