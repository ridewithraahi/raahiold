const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fast2SMS configuration
const FAST2SMS_API_KEY = 'LVe05dq8RbXOQ4KYzwkPEutfpBIg2ZTcCs7NDG9ji1rHlonSaWBMshIdTp128zt9EmZOGonJAlrK0xWy';

// Store OTPs (in production, use a proper database)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone number
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
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
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes in milliseconds
        });

        // Send OTP via Fast2SMS WhatsApp
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": FAST2SMS_API_KEY
            },
            body: JSON.stringify({
                route: "w",
                message: `Your Raahi verification code is: ${otp}. Valid for 5 minutes.`,
                numbers: phone.replace(/\D/g, ""),
                channel: "whatsapp"
            })
        });

        const data = await response.json();
        console.log("Fast2SMS Response:", data);
        
        if (data.return === true) {
            res.json({ success: true, message: 'OTP sent successfully' });
        } else {
            throw new Error(data.message || 'Failed to send OTP');
        }

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
            return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
        }

        const storedData = otpStore.get(phone);
        
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'No OTP found for this number' });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(phone);
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (storedData.code !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Clear the OTP after successful verification
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 
