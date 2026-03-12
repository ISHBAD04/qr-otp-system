const express = require('express');
const QRCode = require('qrcode');
const otpGenerator = require('otp-generator');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- FIX 1: Serve the frontend files ---
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Verification Route ---
app.get('/verify-page', (req, res) => {
    const receivedOtp = req.query.otp;
    if (!receivedOtp) {
        return res.send('<h1>Error</h1><p>No OTP detected.</p>');
    }
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>Verification Page</h1>
            <div style="background: #e7f3ff; display: inline-block; padding: 20px; border-radius: 10px;">
                <p>Received OTP: <strong style="color: #003366; font-size: 2rem;">${receivedOtp}</strong></p>
            </div>
        </div>
    `);
});

const otpStore = {}; 

app.post('/generate', async (req, res) => {
    const { userId } = req.body;
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[userId] = { otp, expires: Date.now() + 300000 };

    try {
        const qrOptions = { color: { dark: '#003366', light: '#F0F0F0' }, width: 300 };
        
        // --- FIX 2: Use your LIVE Vercel link here ---
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        
        const qrImage = await QRCode.toDataURL(autoFillUrl, qrOptions);
        res.json({ otp, qrCode: qrImage });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate QR" });
    }
});