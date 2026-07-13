<?php
declare(strict_types=1);

// Allowed origins come from CORS_ALLOWED_ORIGINS (comma-separated) when set,
// so deployments can declare their own front-end origins without a code change.
// The default is the local development set.
$defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
];

$originsEnv = getenv('CORS_ALLOWED_ORIGINS');
$allowedOrigins = ($originsEnv === false || trim($originsEnv) === '')
    ? $defaultOrigins
    : array_values(array_filter(array_map('trim', explode(',', $originsEnv))));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}