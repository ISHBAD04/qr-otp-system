const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const app = express();

app.use(express.json());

// PENTING: Baris ni pastikan koko.png boleh dibaca oleh browser
app.use(express.static(path.join(__dirname)));

const activeSessions = {};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/request-session', async (req, res) => {
    const { username } = req.body;
    const sessionId = Math.random().toString(36).substring(2, 10);
    activeSessions[sessionId] = { username, authorized: false };

    // Gunakan domain Vercel kau yang terkini
    const authUrl = `https://qr-otp-system-g32y.vercel.app/?id=${sessionId}`;
    
    try {
        const qrImage = await QRCode.toDataURL(authUrl);
        res.json({ sessionId, qrImage });
    } catch (err) {
        res.status(500).json({ error: "QR Generation Failed" });
    }
});

app.get('/approve-session', (req, res) => {
    const { id } = req.query;
    if (activeSessions[id]) {
        activeSessions[id].authorized = true;
        res.send(`
            <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#FFF5F6;">
                <h1 style="color:#FF4B5C;">✓ PENGESAHAN BERJAYA</h1>
                <p>Akses terminal telah dibenarkan. Anda boleh tutup tab ini.</p>
            </body>
        `);
    } else {
        res.status(404).send("Sesi tamat tempoh.");
    }
});

app.get('/check-status', (req, res) => {
    const { id } = req.query;
    const session = activeSessions[id];
    if (session && session.authorized) {
        res.json({ status: 'approved' });
        delete activeSessions[id];
    } else {
        res.json({ status: 'pending' });
    }
});

module.exports = app;