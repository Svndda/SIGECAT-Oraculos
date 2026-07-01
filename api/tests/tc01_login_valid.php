<?php
declare(strict_types=1);

/**
 * TC-01 — Login con credenciales válidas
 * Espera: el sistema autentica, devuelve access_token y datos del usuario.
 *
 * Precondición: existe el usuario admin semilla; sus credenciales se resuelven
 * vía tc_admin_email()/tc_admin_password() (env var u OCIConfig, gitignored).
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-01 — Login con credenciales válidas\n";

$response = tc_http('POST', '/auth/login', [
    'email'    => tc_admin_email(),
    'password' => tc_admin_password(),
]);

tc_assert($response['status'] === 200, 'TC-01', "HTTP status 200 (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-01', 'response body is valid JSON');
tc_assert(isset($response['body']['data']['access_token']), 'TC-01', 'access_token present in response');
tc_assert(isset($response['body']['data']['refresh_token']), 'TC-01', 'refresh_token present in response');
tc_assert(($response['body']['data']['email'] ?? null) === 'juan.perez@ucr.ac.cr', 'TC-01', 'email returned matches login');
tc_assert(empty($response['body']['errors']), 'TC-01', 'no errors in response');

echo "\033[32mTC-01 OK\033[0m\n";
