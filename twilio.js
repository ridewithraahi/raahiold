// Twilio configuration
const TESTING_MODE = true; // Set to false in production

// Format phone number to E.164 format
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

  return "+91" + cleaned;
}

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
export async function sendOTP(phoneNumber) {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);

    if (TESTING_MODE) {
      // In testing mode, store OTP in session storage
      const testOTP = generateOTP();
      console.log("🔐 Test Mode - Your OTP is:", testOTP);
      sessionStorage.setItem("testOTP", testOTP);
      sessionStorage.setItem("testPhone", formattedNumber);
      sessionStorage.setItem("otpSentAt", Date.now().toString());
      // Show OTP as an alert
      alert("Your OTP is: " + testOTP);
      return true;
    }

    // This part will be used when we have the server running
    const response = await fetch("/api/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: formattedNumber }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to send OTP");
    }

    sessionStorage.setItem("otpSentAt", Date.now().toString());
    return true;
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

    // This part will be used when we have the server running
    const response = await fetch("/api/verify-otp", {
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

// Log Twilio errors for debugging
function logTwilioError(error) {
  console.error("Twilio Error:", {
    message: error.message,
    code: error.code,
    moreInfo: error.moreInfo,
    status: error.status,
  });
}
