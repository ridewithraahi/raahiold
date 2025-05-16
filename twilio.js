// Fast2SMS configuration
const FAST2SMS_API_KEY = 'LVe05dq8RbXOQ4KYzwkPEutfpBIg2ZTcCs7NDG9ji1rHlonSaWBMshIdTp128zt9EmZOGonJAlrK0xWy';
const TESTING_MODE = false; // Set to false in production
const API_BASE_URL = 'http://localhost:3001'; // Added base URL with new port

// Format phone number to Indian format
export function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, "");

  // Remove 91 or +91 if present
  if (cleaned.startsWith("91")) {
    cleaned = cleaned.substring(2);
  }

  // Validate Indian mobile number
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new Error("Invalid Indian mobile number format");
  }

  return cleaned;
}

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Fast2SMS WhatsApp
export async function sendOTP(phoneNumber) {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const otp = generateOTP();

    if (TESTING_MODE) {
      // Store OTP for testing
      sessionStorage.setItem("testOTP", otp);
      sessionStorage.setItem("testPhone", formattedNumber);
      sessionStorage.setItem("otpSentAt", Date.now().toString());
      return true;
    }

    // Send OTP via Fast2SMS WhatsApp API
    const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": FAST2SMS_API_KEY
      },
      body: JSON.stringify({
        phone: formattedNumber
      })
    });

    const data = await response.json();
    console.log("Fast2SMS Response:", data); // Added for debugging
    
    if (data.success) {
      sessionStorage.setItem("otpSentAt", Date.now().toString());
      return true;
    } else {
      throw new Error(data.message || "Failed to send OTP");
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
}

// Verify OTP
export async function verifyOTP(phoneNumber, userOTP) {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);

    if (TESTING_MODE) {
      // In testing mode, verify against stored OTP
      const testOTP = sessionStorage.getItem("testOTP");
      const testPhone = sessionStorage.getItem("testPhone");

      if (!testOTP || !testPhone || testPhone !== formattedNumber) {
        throw new Error("Invalid OTP request. Please request a new OTP.");
      }

      if (isOTPExpired()) {
        sessionStorage.removeItem("testOTP");
        sessionStorage.removeItem("testPhone");
        throw new Error("OTP has expired. Please request a new one.");
      }

      const isValid = testOTP === userOTP;
      if (isValid) {
        // Clear test data
        sessionStorage.removeItem("testOTP");
        sessionStorage.removeItem("testPhone");
        sessionStorage.removeItem("otpSentAt");
      } else {
        throw new Error("Invalid OTP. Please try again.");
      }

      return isValid;
    }

    // In production, verify against backend
    const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: formattedNumber,
        otp: userOTP,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Invalid OTP");
    }

    sessionStorage.removeItem("otpSentAt");
    return true;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
}

// Check if OTP has expired (5 minutes)
export function isOTPExpired() {
  const sentAt = sessionStorage.getItem("otpSentAt");
  if (!sentAt) return true;

  const now = Date.now();
  const diff = now - parseInt(sentAt);
  return diff > 5 * 60 * 1000; // 5 minutes in milliseconds
}

// Get remaining time for OTP in seconds
export function getOTPRemainingTime() {
  const sentAt = sessionStorage.getItem("otpSentAt");
  if (!sentAt) return 0;

  const now = Date.now();
  const diff = now - parseInt(sentAt);
  const remaining = 5 * 60 - Math.floor(diff / 1000);
  return Math.max(0, remaining);
} 
