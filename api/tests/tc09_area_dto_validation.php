<?php
declare(strict_types=1);

/**
 * TC-09 — AreaRequestDTO: validación de campos
 *
 * Verifica que:
 *  - nombre vacío lanza ApiException (MISSING_FIELD)
 *  - nombre > 110 caracteres lanza ApiException
 *  - descripción > 255 caracteres lanza ApiException
 *  - un área válida pasa validate() sin lanzar
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\AreaRequestDTO;
use Http\ApiException;

echo "TC-09 — AreaRequestDTO valida nombre y descripción\n";

/** @param array<string,mixed> $data */
$expectThrows = function (array $data, string $label): void {
    $thrown = null;
    try {
        AreaRequestDTO::fromArray($data)->validate();
    } catch (ApiException $e) {
        $thrown = $e;
    }
    tc_assert($thrown !== null, 'TC-09', "$label lanza ApiException");
};

// Nombre vacío.
$expectThrows(['name' => ''], 'nombre vacío');

// Nombre demasiado largo.
$expectThrows(['name' => str_repeat('a', 111)], 'nombre > 110 chars');

// Descripción demasiado larga.
$expectThrows(['name' => 'Recursos Humanos', 'description' => str_repeat('x', 256)], 'descripción > 255 chars');

// Área válida: no debe lanzar.
$ok = true;
try {
    AreaRequestDTO::fromArray(['name' => 'Recursos Humanos', 'description' => 'Área de RRHH'])->validate();
} catch (ApiException $e) {
    $ok = false;
}
tc_assert($ok, 'TC-09', 'área válida pasa validate()');

echo "\033[32mTC-09 OK — AreaRequestDTO valida correctamente\033[0m\n";
