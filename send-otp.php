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

$phone = $input['phone'];
$otp = $input['otp'];

// Validate phone number
if (!preg_match('/^\+91[6-9]\d{9}$/', $phone)) {
    sendResponse(false, 'Invalid phone number format');
}

// Twilio credentials
$account_sid = 'AC5c7c5c7c5c7c5c7c5c7c5c7c5c7c5c7c';
$auth_token = '5c7c5c7c5c7c5c7c5c7c5c7c5c7c5c7c';
$twilio_number = '+15005550006';

// Prepare Twilio request
$url = "https://api.twilio.com/2010-04-01/Accounts/$account_sid/Messages.json";
$data = array(
    'To' => $phone,
    'From' => $twilio_number,
    'Body' => "Your Raahi verification code is: $otp. Valid for 5 minutes."
);

// Send request
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_USERPWD, "$account_sid:$auth_token");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Handle response
if ($http_code >= 200 && $http_code < 300) {
    sendResponse(true, 'OTP sent successfully');
} else {
    $error_data = json_decode($response, true);
    sendResponse(false, $error_data['message'] ?? 'Failed to send OTP', $error_data);
}
?> 