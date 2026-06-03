<?php
declare(strict_types=1);

/**
 * TC-12 — CreateSectionDTO: validación de campos
 *
 * Una sección exige area_id y name. Verifica los rechazos y el caso válido.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\CreateSectionDTO;
use Http\ApiException;

echo "TC-12 — CreateSectionDTO valida area_id y name\n";

/** @param array<string,mixed> $data */
$expectThrows = function (array $data, string $label): void {
    $thrown = null;
    try {
        CreateSectionDTO::fromArray($data)->validate();
    } catch (ApiException $e) {
        $thrown = $e;
    }
    tc_assert($thrown !== null, 'TC-12', "$label lanza ApiException");
};

// Falta area_id.
$expectThrows(['name' => 'Sección A'], 'sin area_id');

// Falta name.
$expectThrows(['area_id' => '01HZX0AREA00000000000000AA'], 'sin name');

// Nombre demasiado largo.
$expectThrows(['area_id' => '01HZX0AREA00000000000000AA', 'name' => str_repeat('s', 111)], 'name > 110 chars');

// Sección válida.
$ok = true;
try {
    CreateSectionDTO::fromArray([
        'area_id' => '01HZX0AREA00000000000000AA',
        'name'    => 'Sección Contable',
    ])->validate();
} catch (ApiException $e) {
    $ok = false;
}
tc_assert($ok, 'TC-12', 'sección válida pasa validate()');

echo "\033[32mTC-12 OK — CreateSectionDTO valida correctamente\033[0m\n";
