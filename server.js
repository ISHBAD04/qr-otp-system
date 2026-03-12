const express = require('express');
const QRCode = require('qrcode');
const otpGenerator = require('otp-generator');
const cors = require('cors');
const path = require('path'); // Added for file paths

const app = express();
app.use(cors());
app.use(express.json());

// Serve the index.html file at http://localhost:3000
// --- ADD THIS HERE ---
app.get('/verify-page', (req, res) => {
    const receivedOtp = req.query.otp; // This grabs the ?otp=123456 from the URL
    if (!receivedOtp) {
        return res.send('<h1>Error</h1><p>No OTP detected in the URL.</p>');
    }
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>Verification Page</h1>
            <p style="font-size: 1.2rem;">Scanning successful!</p>
            <div style="background: #e7f3ff; display: inline-block; padding: 20px; border-radius: 10px;">
                <p>Received OTP: <strong style="color: #003366; font-size: 2rem;">${receivedOtp}</strong></p>
            </div>
            <p>You can now use this code to log in.</p>
        </div>
    `);
});

const otpStore = {}; 

app.post('/generate', async (req, res) => {
    const { userId } = req.body;
    const otp = otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        specialChars: false, 
        lowerCaseAlphabets: false 
    });

    otpStore[userId] = { otp, expires: Date.now() + 300000 };

    try {
        const qrOptions = {
            color: {
                dark: '#003366',  
                light: '#F0F0F0'  
            },
            margin: 2,           
            width: 300           
        };

        const autoFillUrl = `http://localhost:3000/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl, qrOptions);
        res.json({ otp, qrCode: qrImage });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate QR" });
    }
}); // <--- THIS WAS MISSING IN YOUR CODE

app.post('/verify', (req, res) => {
    const { userId, userOtp } = req.body;
    const record = otpStore[userId];

    if (!record || Date.now() > record.expires) {
        return res.status(400).json({ message: "OTP Expired or Invalid" });
    }

    if (record.otp === userOtp) {
        delete otpStore[userId];
        res.json({ success: true, message: "Verified!" });
    } else {
        res.status(400).json({ message: "Wrong OTP" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));