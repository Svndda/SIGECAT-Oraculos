<?php
declare(strict_types=1);

/**
 * TC-17 — UnitResponseDTO: mapeo de fila Oracle
 *
 * El listado de unidades alimenta los selects del frontend. Verifica que
 * fromArray() normalice las claves Oracle (MAYÚSCULAS) y preserve la
 * asignación (section_id / department_id) y el estado de soft-delete.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\UnitResponseDTO;

echo "TC-17 — UnitResponseDTO normaliza filas de Oracle\n";

// Unidad anclada a un departamento (sección NULL).
$row = [
    'UNIT_ID'       => '01HZX0UNIT00000000000000AA',
    'SECTION_ID'    => null,
    'DEPARTMENT_ID' => '01HZX0DEPT00000000000000BB',
    'NAME'          => 'Unidad de Nómina',
    'DESCRIPTION'   => null,
    'CREATED_AT'    => '28-MAY-26 05.34.02.776554 PM',
    'CREATED_BY'    => '01HZX0USER00000000000000CC',
    'IS_DELETED'    => 0,
    'DELETED_AT'    => null,
];

$out = UnitResponseDTO::fromArray($row)->toArray();

tc_assert($out['id'] === '01HZX0UNIT00000000000000AA', 'TC-17', 'id se mapea desde UNIT_ID');
tc_assert($out['department_id'] === '01HZX0DEPT00000000000000BB', 'TC-17', 'department_id se mapea desde DEPARTMENT_ID');
tc_assert($out['section_id'] === null, 'TC-17', 'section_id NULL se preserva');
tc_assert($out['name'] === 'Unidad de Nómina', 'TC-17', 'name se mapea desde NAME');
tc_assert($out['is_deleted'] === 0, 'TC-17', 'is_deleted se castea a int');

// Unidad anclada a una sección, con claves en minúscula.
$lower = UnitResponseDTO::fromArray([
    'unit_id'    => '01HZX0UNIT00000000000000DD',
    'section_id' => '01HZX0SECT00000000000000EE',
    'name'       => 'Unidad de Auditoría',
    'created_at' => '2026-05-28',
    'created_by' => '01HZX0USER00000000000000CC',
    'is_deleted' => 1,
])->toArray();

tc_assert($lower['section_id'] === '01HZX0SECT00000000000000EE', 'TC-17', 'section_id se mapea desde clave minúscula');
tc_assert($lower['department_id'] === null, 'TC-17', 'department_id ausente queda null');
tc_assert($lower['is_deleted'] === 1, 'TC-17', 'is_deleted=1 se preserva');

echo "\033[32mTC-17 OK — UnitResponseDTO normaliza correctamente\033[0m\n";
