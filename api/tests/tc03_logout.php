<?php
declare(strict_types=1);

/**
 * TC-03 — Logout
 * Espera: sesión cerrada (logged_out: true).
 *
 * Flujo: login -> logout (con bearer token).
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-03 — Cierre de sesión\n";

$login = tc_http('POST', '/auth/login', [
    'email'    => 'juan.perez@ucr.ac.cr',
    'password' => 'Demo1234!',
]);

tc_assert($login['status'] === 200, 'TC-03', 'precondición: login exitoso');
$token = $login['body']['data']['ACCESS_TOKEN'] ?? null;
tc_assert(is_string($token) && $token !== '', 'TC-03', 'access token obtenido del login');

$response = tc_http('POST', '/auth/logout', null, ['Authorization' => "Bearer $token"]);

tc_assert($response['status'] === 200, 'TC-03', "HTTP status 200 (got {$response['status']})");
tc_assert(($response['body']['data']['logged_out'] ?? false) === true, 'TC-03', 'logged_out = true');
tc_assert(empty($response['body']['errors']), 'TC-03', 'no errors in response');

echo "\033[32mTC-03 OK\033[0m\n";
