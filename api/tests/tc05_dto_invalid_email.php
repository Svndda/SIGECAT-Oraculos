<?php
declare(strict_types=1);

/**
 * TC-05 — UserDTO: email inválido
 * Espera: ApiException con código relativo a email inválido.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\RegisterUserDTO;
use Http\ApiException;

echo "TC-05 — DTO rechaza email inválido\n";

$dto = RegisterUserDTO::fromArray([
    'email'      => 'juan@correo',
    'first_name' => 'Juan',
    'last_name'  => 'Perez',
    'password'   => 'Demo1234!',
    'role'       => 'employee',
]);

$thrown = null;
try {
    $dto->validate();
} catch (ApiException $e) {
    $thrown = $e;
}

tc_assert($thrown !== null, 'TC-05', 'validate() lanza ApiException');

$serialized = $thrown?->getError()->jsonSerialize() ?? [];
$code = $serialized['code'] ?? '';
tc_assert(stripos($code, 'EMAIL') !== false || stripos($code, 'INVALID') !== false, 'TC-05', "error code relativo a email (got '$code')");

echo "\033[32mTC-05 OK — email rechazado con code='$code'\033[0m\n";
