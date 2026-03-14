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

// Unified Generate Route
app.post('/generate', async (req, res) => {
    // 1. Extract data - ensures both are handled
    const { userId, email } = req.body; 
    const id = userId || 'Admin_User';
    
    // 2. Generate OTP
    const otp = otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        specialChars: false, 
        lowerCaseAlphabets: false 
    });
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl);

        // 3. Email Logic - Only triggers if an email is provided
        if (email) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'YOUR_EMAIL@gmail.com', 
                    pass: process.env.EMAIL_PASS || 'YOUR_APP_PASSWORD'
                }
            });

            const mailOptions = {
                from: '"MONG Secure Access" <YOUR_EMAIL@gmail.com>',
                to: email,
                subject: 'Your Access QR Code',
                text: `Hello ${id}, scan the attached QR code to receive your OTP.`,
                attachments: [{
                    filename: 'access-qr.png',
                    content: qrImage.split("base64,")[1],
                    encoding: 'base64'
                }]
            };

            await transporter.sendMail(mailOptions);
        }

        // 4. Always return the QR to the dashboard regardless of email status
        res.json({ otp, qrCode: qrImage, success: true });

    } catch (err) {
        console.error("System Error:", err);
        res.status(500).json({ error: "Operation failed" });
    }
});

// Verification logic remains the same
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Local server on 3000'));
}

module.exports = app;