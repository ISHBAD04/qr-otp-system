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

// 1. Serve the main website
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. The page the USER sees on their PHONE after scanning
app.get('/verify-page', (req, res) => {
    const code = req.query.otp;
    res.send(`
        <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #FFF5F6;">
            <div style="text-align: center; padding: 40px; background: white; border-radius: 30px; box-shadow: 0 10px 25px rgba(255,75,92,0.1);">
                <div style="background: #FF4B5C; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: bold;">MONG</div>
                <h2 style="color: #2D2D2D;">Your Access Code</h2>
                <h1 style="font-size: 3.5rem; color: #FF4B5C; letter-spacing: 8px; margin: 20px 0;">${code}</h1>
                <p style="color: #888;">Enter this code on your computer terminal to finish logging in.</p>
            </div>
        </body>
        </html>
    `);
});

// 3. Register & Send QR to Email
app.post('/generate', async (req, res) => {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: "Username and Email required" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[userId] = { otp, expires: Date.now() + 600000 }; 

    try {
        // The QR code links to your live Vercel verify-page
        const qrUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(qrUrl);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'ishbadhaikal@gmail.com', 
                pass: 'dxpcknjyhqpdfaze' // Replace with your generated App Password
            }
        });

        await transporter.sendMail({
            from: '"MONG Secure Access" <ishbadhaikal@gmail.com>',
            to: email,
            subject: 'Your Personal MONG Access QR',
            html: `<p>Hello <b>${userId}</b>,</p><p>Scan the attached QR code with your phone to reveal your 6-digit access token.</p>`,
            attachments: [{
                filename: 'access-qr.png',
                content: qrImage.split("base64,")[1],
                encoding: 'base64'
            }]
        });

        res.json({ success: true, message: "QR Sent" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send email", details: err.message });
    }
});

// 4. Verification Logic
app.post('/verify', (req, res) => {
    const { userId, userOtp } = req.body;
    const record = otpStore[userId];

    if (record && record.otp === userOtp) {
        delete otpStore[userId]; 
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Invalid Code" });
    }
});

module.exports = app;