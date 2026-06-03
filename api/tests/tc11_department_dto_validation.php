<?php
declare(strict_types=1);

/**
 * TC-11 — CreateDepartmentDTO: validación de campos
 *
 * Un departamento exige area_id y name. Verifica que falten esos campos
 * dispare ApiException y que un departamento válido pase validate().
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\CreateDepartmentDTO;
use Http\ApiException;

echo "TC-11 — CreateDepartmentDTO valida area_id y name\n";

/** @param array<string,mixed> $data */
$expectThrows = function (array $data, string $label): void {
    $thrown = null;
    try {
        CreateDepartmentDTO::fromArray($data)->validate();
    } catch (ApiException $e) {
        $thrown = $e;
    }
    tc_assert($thrown !== null, 'TC-11', "$label lanza ApiException");
};

// Falta area_id.
$expectThrows(['name' => 'Reclutamiento'], 'sin area_id');

// Falta name.
$expectThrows(['area_id' => '01HZX0AREA00000000000000AA'], 'sin name');

// Nombre demasiado largo.
$expectThrows(['area_id' => '01HZX0AREA00000000000000AA', 'name' => str_repeat('a', 111)], 'name > 110 chars');

// Departamento válido.
$ok = true;
try {
    CreateDepartmentDTO::fromArray([
        'area_id'     => '01HZX0AREA00000000000000AA',
        'name'        => 'Reclutamiento',
        'description' => 'Departamento de reclutamiento',
    ])->validate();
} catch (ApiException $e) {
    $ok = false;
}
tc_assert($ok, 'TC-11', 'departamento válido pasa validate()');

echo "\033[32mTC-11 OK — CreateDepartmentDTO valida correctamente\033[0m\n";
