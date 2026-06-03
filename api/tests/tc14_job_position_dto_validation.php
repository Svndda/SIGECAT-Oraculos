<?php
declare(strict_types=1);

/**
 * TC-14 — CreateJobPositionDTO: validación de entidad padre
 *
 * Una plaza debe pertenecer a EXACTAMENTE una entidad (área, departamento,
 * sección o unidad), espejando la constraint CHECK_JOB_POSITION_PARENT.
 * Cubre la regla de negocio detrás del bug ORA-02290 que arreglamos.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\CreateJobPositionDTO;
use Http\ApiException;

echo "TC-14 — CreateJobPositionDTO exige exactamente un padre\n";

$base = [
    'job_position_number' => 'PLZ-001',
    'job_position_type_id'=> '01HZX0TYPE00000000000000AA',
];

/** @param array<string,mixed> $extra */
$expectThrows = function (array $extra, string $label) use ($base): void {
    $thrown = null;
    try {
        CreateJobPositionDTO::fromArray($base + $extra)->validate();
    } catch (ApiException $e) {
        $thrown = $e;
    }
    tc_assert($thrown !== null, 'TC-14', "$label lanza ApiException");
};

// Sin ningún padre.
$expectThrows([], 'sin entidad padre');

// Con dos padres a la vez (área + departamento).
$expectThrows([
    'area_id'       => '01HZX0AREA00000000000000AA',
    'department_id' => '01HZX0DEPT00000000000000AA',
], 'dos padres a la vez');

// Falta el número de plaza.
$thrown = null;
try {
    CreateJobPositionDTO::fromArray([
        'job_position_type_id' => '01HZX0TYPE00000000000000AA',
        'area_id'              => '01HZX0AREA00000000000000AA',
    ])->validate();
} catch (ApiException $e) {
    $thrown = $e;
}
tc_assert($thrown !== null, 'TC-14', 'sin job_position_number lanza ApiException');

// Exactamente un padre (cada tipo) debe pasar.
foreach ([
    'area_id'       => '01HZX0AREA00000000000000AA',
    'department_id' => '01HZX0DEPT00000000000000AA',
    'section_id'    => '01HZX0SECT00000000000000AA',
    'unit_id'       => '01HZX0UNIT00000000000000AA',
] as $col => $id) {
    $ok = true;
    try {
        CreateJobPositionDTO::fromArray($base + [$col => $id])->validate();
    } catch (ApiException $e) {
        $ok = false;
    }
    tc_assert($ok, 'TC-14', "plaza con solo $col pasa validate()");
}

echo "\033[32mTC-14 OK — la plaza exige exactamente una entidad padre\033[0m\n";
