<?php
declare(strict_types=1);

/**
 * TC-06 — UserDTO: contraseña débil
 * Espera: ApiException con código WEAK_PASSWORD.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\PasswordValidator;
use Http\ApiException;

echo "TC-06 — DTO rechaza contraseña débil\n";

$thrown = null;
try {
    PasswordValidator::validate('1234');
} catch (ApiException $e) {
    $thrown = $e;
}

tc_assert($thrown !== null, 'TC-06', 'PasswordValidator::validate() lanza ApiException');

$serialized = $thrown?->getError()->jsonSerialize() ?? [];
$code = $serialized['code'] ?? '';
tc_assert($code === 'WEAK_PASSWORD', 'TC-06', "error code WEAK_PASSWORD (got '$code')");

echo "\033[32mTC-06 OK — contraseña '1234' rechazada\033[0m\n";
