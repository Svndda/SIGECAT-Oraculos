<?php
declare(strict_types=1);

/**
 * TC-04 — Registro de usuario con datos válidos (Admin)
 * Espera: 201 Created, sin errores.
 *
 * Genera un email único en cada corrida para evitar colisiones.
 * /users/register exige rol admin, por lo que primero se autentica como admin
 * y se envía el Bearer token.
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-04 — Crear usuario (admin)\n";

$adminLogin = tc_http('POST', '/auth/login', [
    'email'    => tc_admin_email(),
    'password' => tc_admin_password(),
]);
tc_assert($adminLogin['status'] === 200, 'TC-04', 'precondición: login de admin exitoso');
$adminToken = $adminLogin['body']['data']['access_token'] ?? null;
tc_assert(is_string($adminToken) && $adminToken !== '', 'TC-04', 'token de admin obtenido');

$uniqueEmail = 'tc04.' . time() . '.' . random_int(1000, 9999) . '@ucr.ac.cr';
// Throwaway password for the ephemeral user; reuse the seed credential helper
// so no password literal lives in the committed test.
$newUserPassword = tc_admin_password();

$response = tc_http('POST', '/users/register', [
    'email'            => $uniqueEmail,
    'first_name'       => 'Juan',
    'first_last_name'  => 'Perez',
    'second_last_name' => 'Mora',
    'password'         => $newUserPassword,
    'role'             => 'employee',
], ['Authorization' => "Bearer $adminToken"]);

tc_assert($response['status'] === 201, 'TC-04', "HTTP status 201 Created (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-04', 'response body is valid JSON');
tc_assert(empty($response['body']['errors']), 'TC-04', 'no errors in response');

$verifyLogin = tc_http('POST', '/auth/login', [
    'email'    => $uniqueEmail,
    'password' => $newUserPassword,
]);
tc_assert($verifyLogin['status'] === 200, 'TC-04', 'usuario creado puede autenticarse');

echo "\033[32mTC-04 OK — usuario creado: $uniqueEmail\033[0m\n";
