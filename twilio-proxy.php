<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Twilio configuration
$account_sid = 'AC5c7c5c7c5c7c5c7c5c7c5c7c5c7c5c7c';
$auth_token = '5c7c5c7c5c7c5c7c5c7c5c7c5c7c5c7c';
$twilio_number = '+15005550006';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone']) || !isset($data['otp'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$to_number = $data['phone'];
$otp = $data['otp'];

// Prepare the Twilio API request
$url = "https://api.twilio.com/2010-04-01/Accounts/$account_sid/Messages.json";
$data = array(
    'To' => $to_number,
    'From' => $twilio_number,
    'Body' => "Your Raahi verification code is: $otp. Valid for 5 minutes."
);

// Initialize cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
curl_setopt($ch, CURLOPT_USERPWD, "$account_sid:$auth_token");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Send request and get response
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($http_code >= 200 && $http_code < 300) {
    echo $response;
} else {
    http_response_code($http_code);
    echo json_encode(['error' => 'Failed to send SMS', 'details' => json_decode($response)]);
}

curl_close($ch);
?> 