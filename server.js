const express = require('express');
const QRCode = require('qrcode');
const otpGenerator = require('otp-generator');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Verification Page (What the user sees on their phone) ---
app.get('/verify-page', (req, res) => {
    const receivedOtp = req.query.otp;
    if (!receivedOtp) {
        return res.send('<h1>Error</h1><p>No OTP detected.</p>');
    }
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background: #f0f2f5; height: 100vh; padding-top: 50px;">
            <div style="background: white; display: inline-block; padding: 40px; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #003366;">CEMA Secure Scan</h1>
                <p style="font-size: 1.2rem; color: #666;">Your One-Time Password is:</p>
                <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <strong style="color: #003366; font-size: 3rem; letter-spacing: 5px;">${receivedOtp}</strong>
                </div>
                <p id="status" style="color: #28a745; font-weight: bold;">✅ Scan Successful</p>
                <p style="color: #999; font-size: 0.8rem;">Enter this code on your dashboard to proceed.</p>
            </div>
        </div>
    `);
});

const otpStore = {}; 

// --- Generate OTP and QR ---
app.post('/generate', async (req, res) => {
    const { userId } = req.body;
    // Ensure we have a userId to store the OTP against
    const id = userId || 'Admin_User'; 
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const qrOptions = { color: { dark: '#003366', light: '#F0F0F0' }, width: 300 };
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        
        const qrImage = await QRCode.toDataURL(autoFillUrl, qrOptions);
        res.json({ otp, qrCode: qrImage });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate QR" });
    }
});

// --- Verify OTP logic ---
app.post('/verify', (req, res) => {
    const { userId, userOtp } = req.body;
    const id = userId || 'Admin_User';
    const record = otpStore[id];

    if (!record || Date.now() > record.expires) {
        return res.status(400).json({ success: false, message: "OTP Expired or Invalid" });
    }

    if (record.otp === userOtp) {
        delete otpStore[id]; 
        res.json({ success: true, message: "Verified!" });
    } else {
        res.status(400).json({ success: false, message: "Wrong OTP" });
    }
});

// --- CRITICAL VERCEL FIX ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // This MUST be here for Vercel