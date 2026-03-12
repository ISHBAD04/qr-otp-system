const express = require('express');
const QRCode = require('qrcode');
const otpGenerator = require('otp-generator');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verify-page', (req, res) => {
    const receivedOtp = req.query.otp;
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>OTP: ${receivedOtp}</h1>
            <p>Enter this on your dashboard.</p>
        </div>
    `);
});

const otpStore = {};

app.post('/generate', async (req, res) => {
    const id = req.body.userId || 'Admin_User';
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl);
        res.json({ otp, qrCode: qrImage });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate QR" });
    }
});

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

// VERCEL FIX: Do not use app.listen in production
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Local server on 3000'));
}

module.exports = app;