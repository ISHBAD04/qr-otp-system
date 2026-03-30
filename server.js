const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const mongoose = require('mongoose'); 
require('dotenv').config(); 
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// --- CONNECT DATABASE ---
// Pastikan kau dah set MONGO_URI dalam fail .env
const mongoURI = process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("CEMA DATABASE: CONNECTED ✅"))
    .catch(err => console.error("DB Connection Error:", err));

// Skema untuk simpan sesi login ke MongoDB
const sessionSchema = new mongoose.Schema({
    sessionId: String,
    username: String,
    authorized: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete lepas 5 minit
});
const Session = mongoose.model('Session', sessionSchema);

// --- ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Request Session & Simpan ke DB
app.post('/request-session', async (req, res) => {
    const { username } = req.body;
    const sessionId = Math.random().toString(36).substring(2, 10);
    
    try {
        // Simpan maklumat sesi ke MongoDB
        await Session.create({ sessionId, username });

        const authUrl = `https://qr-otp-system-g32y.vercel.app/?id=${sessionId}`;
        const qrImage = await QRCode.toDataURL(authUrl);
        
        res.json({ sessionId, qrImage });
    } catch (err) {
        res.status(500).json({ error: "Database or QR Error" });
    }
});

// 2. Approve Session (Bila user scan QR)
app.get('/approve-session', async (req, res) => {
    const { id } = req.query;
    try {
        // Update status 'authorized' jadi true dalam DB
        const session = await Session.findOneAndUpdate({ sessionId: id }, { authorized: true });

        if (session) {
            res.send(`
                <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#f8f9fa;">
                    <div style="background:white; display:inline-block; padding:40px; border-radius:20px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                        <h1 style="color:#2ecc71;">✓ PENGESAHAN BERJAYA</h1>
                        <p style="color:#666;">Terminal CEMA telah disahkan. Anda boleh tutup tab ini.</p>
                    </div>
                </body>
            `);
        } else {
            res.status(404).send("Sesi tidak dijumpai atau tamat tempoh.");
        }
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// 3. Check Status (Polling dari frontend)
app.get('/check-status', async (req, res) => {
    const { id } = req.query;
    try {
        const session = await Session.findOne({ sessionId: id });

        if (session && session.authorized) {
            res.json({ status: 'approved' });
            // Session akan auto-delete sendiri dari DB ikut 'expires' tadi
        } else {
            res.json({ status: 'pending' });
        }
    } catch (err) {
        res.json({ status: 'error' });
    }
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

module.exports = app;