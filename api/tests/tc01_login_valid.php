<?php
declare(strict_types=1);

/**
 * TC-01 — Login con credenciales válidas
 * Espera: el sistema autentica, devuelve ACCESS_TOKEN y datos del usuario.
 *
 * Precondición: usuario juan.perez@ucr.ac.cr con contraseña Demo1234! existe.
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-01 — Login con credenciales válidas\n";

$response = tc_http('POST', '/auth/login', [
    'email'    => 'juan.perez@ucr.ac.cr',
    'password' => 'Demo1234!',
]);

tc_assert($response['status'] === 200, 'TC-01', "HTTP status 200 (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-01', 'response body is valid JSON');
tc_assert(isset($response['body']['data']['ACCESS_TOKEN']), 'TC-01', 'ACCESS_TOKEN present in response');
tc_assert(isset($response['body']['data']['REFRESH_TOKEN']), 'TC-01', 'REFRESH_TOKEN present in response');
tc_assert(($response['body']['data']['EMAIL'] ?? null) === 'juan.perez@ucr.ac.cr', 'TC-01', 'email returned matches login');
tc_assert(empty($response['body']['errors']), 'TC-01', 'no errors in response');

echo "\033[32mTC-01 OK\033[0m\n";
