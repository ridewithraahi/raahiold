<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Simple response function
function sendResponse($success, $message = '', $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed');
}

// Get and validate input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['phone']) || !isset($input['otp'])) {
    sendResponse(false, 'Missing required parameters');
}

$phone = preg_replace('/\D/', '', $input['phone']);
$otp = $input['otp'];

// Validate phone number
if (!preg_match('/^[6-9]\d{9}$/', $phone)) {
    sendResponse(false, 'Invalid phone number format');
}

// Fast2SMS API credentials
$api_key = 'LVe05dq8RbXOQ4KYzwkPEutfpBIg2ZTcCs7NDG9ji1rHlonSaWBMshIdTp128zt9EmZOGonJAlrK0xWy';

// Prepare Fast2SMS WhatsApp API request
$url = 'https://www.fast2sms.com/dev/bulkV2';
$data = array(
    'route' => 'w', // WhatsApp route
    'message' => "Your Raahi verification code is: $otp. Valid for 5 minutes.",
    'numbers' => $phone,
    'channel' => 'whatsapp'
);

$headers = array(
    'Authorization: ' . $api_key,
    'Content-Type: application/json'
);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Handle response
$response_data = json_decode($response, true);
if ($http_code >= 200 && $http_code < 300 && isset($response_data['return']) && $response_data['return'] === true) {
    sendResponse(true, 'OTP sent successfully');
} else {
    sendResponse(false, $response_data['message'] ?? 'Failed to send OTP', $response_data);
}
?> 
