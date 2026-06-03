<?php
declare(strict_types=1);

/**
 * TC-08 — UsersController: manejo de JSON malformado
 * Espera: el sistema responde con error estructurado (Response::error)
 *         y código INVALID_JSON.
 */

require_once __DIR__ . '/bootstrap.php';
tc_require_server();

echo "TC-08 — Request con JSON malformado\n";

$malformed = '{ "email": "a@b.com", "password": '; // JSON cortado a propósito

$response = tc_http('POST', '/users/register', null, [], $malformed);

tc_assert($response['status'] >= 400 && $response['status'] < 500, 'TC-08', "HTTP status 4xx (got {$response['status']})");
tc_assert($response['body'] !== null, 'TC-08', 'response sigue siendo JSON válido (estructura estándar)');
tc_assert(array_key_exists('data', $response['body']) && array_key_exists('errors', $response['body']), 'TC-08', 'estructura {data, meta, errors} preservada');
tc_assert(array_key_exists('data', $response['body']) && $response['body']['data'] === null, 'TC-08', 'data es null en el error');
tc_assert(!empty($response['body']['errors']), 'TC-08', 'errors array poblado');

$code = $response['body']['errors'][0]['code'] ?? '';
tc_assert($code === 'INVALID_JSON', 'TC-08', "código INVALID_JSON (got '$code')");

echo "\033[32mTC-08 OK\033[0m\n";
