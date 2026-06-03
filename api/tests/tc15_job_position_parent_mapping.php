<?php
declare(strict_types=1);

/**
 * TC-15 — CreateJobPositionDTO::parent(): columna correcta
 *
 * El repositorio inserta en la columna FK que devuelve parent(). Si el
 * mapeo está mal, la plaza se ancla a la entidad equivocada. Verifica
 * que cada tipo de padre devuelva [columna, id] correctos.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\CreateJobPositionDTO;

echo "TC-15 — parent() devuelve la columna FK correcta\n";

$cases = [
    'area_id'       => '01HZX0AREA00000000000000AA',
    'department_id' => '01HZX0DEPT00000000000000BB',
    'section_id'    => '01HZX0SECT00000000000000CC',
    'unit_id'       => '01HZX0UNIT00000000000000DD',
];

foreach ($cases as $col => $id) {
    $dto = CreateJobPositionDTO::fromArray([
        'job_position_number'  => 'PLZ-100',
        'job_position_type_id' => '01HZX0TYPE00000000000000AA',
        $col                   => $id,
    ]);

    [$column, $value] = $dto->parent();

    tc_assert($column === $col, 'TC-15', "parent() devuelve columna '$col'");
    tc_assert($value === $id,   'TC-15', "parent() devuelve el id de '$col'");
}

echo "\033[32mTC-15 OK — parent() mapea cada entidad a su columna FK\033[0m\n";
