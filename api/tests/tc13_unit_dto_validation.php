<?php
declare(strict_types=1);

/**
 * TC-13 — CreateUnitDTO: validación de asignación
 *
 * Una unidad debe colgar de un departamento O una sección (al menos uno).
 * Verifica que sin asignación y sin nombre se rechace, y que las dos
 * asignaciones válidas (departamento / sección) pasen.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\CreateUnitDTO;
use Http\ApiException;

echo "TC-13 — CreateUnitDTO valida nombre y asignación\n";

/** @param array<string,mixed> $data */
$expectThrows = function (array $data, string $label): void {
    $thrown = null;
    try {
        CreateUnitDTO::fromArray($data)->validate();
    } catch (ApiException $e) {
        $thrown = $e;
    }
    tc_assert($thrown !== null, 'TC-13', "$label lanza ApiException");
};

// Sin nombre.
$expectThrows(['department_id' => '01HZX0DEPT00000000000000AA'], 'sin name');

// Sin asignación (ni department_id ni section_id).
$expectThrows(['name' => 'Unidad X'], 'sin departamento ni sección');

// Asignación a departamento: válida.
$okDept = true;
try {
    CreateUnitDTO::fromArray([
        'name'          => 'Unidad de Nómina',
        'department_id' => '01HZX0DEPT00000000000000AA',
    ])->validate();
} catch (ApiException $e) {
    $okDept = false;
}
tc_assert($okDept, 'TC-13', 'unidad con department_id pasa validate()');

// Asignación a sección: válida.
$okSect = true;
try {
    CreateUnitDTO::fromArray([
        'name'       => 'Unidad de Auditoría',
        'section_id' => '01HZX0SECT00000000000000AA',
    ])->validate();
} catch (ApiException $e) {
    $okSect = false;
}
tc_assert($okSect, 'TC-13', 'unidad con section_id pasa validate()');

echo "\033[32mTC-13 OK — CreateUnitDTO valida asignación correctamente\033[0m\n";
