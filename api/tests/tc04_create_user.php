<?php
declare(strict_types=1);

/**
 * TC-04 — Registro de usuario con datos válidos (Admin)
 * Espera: 201 Created, sin errores.
 *
 * Genera un email único en cada corrida para evitar colisiones.
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-04 — Crear usuario (admin)\n";

$uniqueEmail = 'tc04.' . time() . '.' . random_int(1000, 9999) . '@ucr.ac.cr';

$response = tc_http('POST', '/users/register', [
    'email'      => $uniqueEmail,
    'first_name' => 'Juan',
    'last_name'  => 'Perez',
    'password'   => 'Demo1234!',
    'role'       => 'employee',
]);

tc_assert($response['status'] === 201, 'TC-04', "HTTP status 201 Created (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-04', 'response body is valid JSON');
tc_assert(empty($response['body']['errors']), 'TC-04', 'no errors in response');

$verifyLogin = tc_http('POST', '/auth/login', [
    'email'    => $uniqueEmail,
    'password' => 'Demo1234!',
]);
tc_assert($verifyLogin['status'] === 200, 'TC-04', 'usuario creado puede autenticarse');

echo "\033[32mTC-04 OK — usuario creado: $uniqueEmail\033[0m\n";
