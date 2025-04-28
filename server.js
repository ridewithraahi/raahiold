require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Store OTPs (in production, use a proper database)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone number
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91')) {
        cleaned = cleaned.substring(2);
    }
    return /^[6-9]\d{9}$/.test(cleaned);
}

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        if (!validatePhone(phone)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format' });
        }

        const otp = generateOTP();
        
        // Store OTP with 5-minute expiry
        otpStore.set(phone, {
            code: otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        // Send SMS using Twilio
        await client.messages.create({
            body: `Your Raahi verification code is: ${otp}. Valid for 5 minutes.`,
            to: phone,
            from: twilioPhone
        });

        res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP',
            error: error.message 
        });
    }
});

// Verify OTP endpoint
app.post('/api/verify-otp', (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number and OTP are required' 
            });
        }

        const storedData = otpStore.get(phone);
        
        if (!storedData) {
            return res.status(400).json({ 
                success: false, 
                message: 'No OTP request found. Please request a new OTP.' 
            });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(phone);
            return res.status(400).json({ 
                success: false, 
                message: 'OTP has expired. Please request a new one.' 
            });
        }

        if (otp !== storedData.code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid OTP. Please try again.' 
            });
        }

        // Clear OTP after successful verification
        otpStore.delete(phone);

        res.json({ success: true, message: 'OTP verified successfully' });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to verify OTP',
            error: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 