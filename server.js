const express = require('express');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Session store for Cadet Officer terminal access
const activeSessions = {}; 

// 1. Serve the Combined index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. PC Initialization
app.post('/request-session', async (req, res) => {
    const { username } = req.body;
    const sessionId = Math.random().toString(36).substring(2, 10);
    activeSessions[sessionId] = { username, authorized: false };

    // Point the QR back to the main page with the ID parameter
    const authUrl = `https://qr-otp-system-g32y.vercel.app/?id=${sessionId}`;
    
    try {
        const qrImage = await QRCode.toDataURL(authUrl);
        res.json({ sessionId, qrImage });
    } catch (err) {
        res.status(500).json({ error: "QR Error" });
    }
});

// 3. Mobile Approval Logic
app.get('/approve-session', (req, res) => {
    const { id } = req.query;
    if (activeSessions[id]) {
        activeSessions[id].authorized = true;
        // Success message for the Cadet/User on mobile
        res.send(`
            <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#FFF5F6;">
                <h1 style="color:#FF4B5C;">✓ ACCESS GRANTED</h1>
                <p>Terminal session authorized for ${activeSessions[id].username}.</p>
                <p style="font-size:0.8rem; color:#888;">You may close this tab.</p>
            </body>
        `);
    } else {
        res.status(404).send("Invalid or expired session.");
    }
});

// 4. PC Polling Endpoint
app.get('/check-status', (req, res) => {
    const { id } = req.query;
    const session = activeSessions[id];
    
    if (session && session.authorized) {
        res.json({ status: 'approved' });
        delete activeSessions[id]; // Security: One-time use session
    } else {
        res.json({ status: 'pending' });
    }
});

module.exports = app;