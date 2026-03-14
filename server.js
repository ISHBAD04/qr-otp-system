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

app.post('/generate', async (req, res) => {
    // 1. Get email and userId from the request body
    const { userId, email } = req.body; 
    const id = userId || 'Admin_User';
    
    // 2. Generate the 6-digit OTP
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    otpStore[id] = { otp, expires: Date.now() + 300000 };

    try {
        const autoFillUrl = `https://qr-otp-system-g32y.vercel.app/verify-page?otp=${otp}`;
        const qrImage = await QRCode.toDataURL(autoFillUrl);

        // --- EMAIL SENDING LOGIC START ---
        
        // 3. Configure your SMTP Transporter (Example using Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'YOUR_EMAIL@gmail.com', // Your system email
                pass: 'YOUR_APP_PASSWORD'    // Your 16-character App Password
            }
        });

        // 4. Set up the email content
        const mailOptions = {
            from: '"MONG Secure Access" <YOUR_EMAIL@gmail.com>',
            to: email, // Sends to the email the user typed in the form
            subject: 'Your Access QR Code',
            text: `Hello ${id}, scan the attached QR code to receive your OTP.`,
            attachments: [
                {
                    filename: 'access-qr.png',
                    content: qrImage.split("base64,")[1],
                    encoding: 'base64'
                }
            ]
        };

        // 5. Trigger the send
        await transporter.sendMail(mailOptions);

        // --- EMAIL SENDING LOGIC END ---

        res.json({ otp, qrCode: qrImage, success: true });
    } catch (err) {
        console.error("Mail Error:", err);
        res.status(500).json({ error: "Failed to generate or send email" });
    }
});

// VERCEL FIX: Do not use app.listen in production
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Local server on 3000'));
}

module.exports = app;