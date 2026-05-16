<?php
declare(strict_types=1);

/**
 * TC-02 — Login con contraseña incorrecta
 * Espera: error INVALID_CREDENTIALS, no se inicia sesión.
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-02 — Login con contraseña incorrecta\n";

$response = tc_http('POST', '/auth/login', [
    'email'    => 'juan.perez@ucr.ac.cr',
    'password' => 'wrong123',
]);

tc_assert($response['status'] >= 400 && $response['status'] < 500, 'TC-02', "HTTP status 4xx (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-02', 'response body is valid JSON');
tc_assert(array_key_exists('data', $response['body']) && $response['body']['data'] === null, 'TC-02', 'data is null (no session created)');
tc_assert(!empty($response['body']['errors']), 'TC-02', 'errors array is populated');

$code = $response['body']['errors'][0]['code'] ?? '';
tc_assert($code === 'INVALID_CREDENTIALS', 'TC-02', "error code is INVALID_CREDENTIALS (got '$code')");

echo "\033[32mTC-02 OK\033[0m\n";
