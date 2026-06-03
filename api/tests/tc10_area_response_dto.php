<?php
declare(strict_types=1);

/**
 * TC-10 — AreaResponseDTO: mapeo de fila Oracle a contrato de respuesta
 *
 * Regresión del bug de "Error al eliminar / El recurso 'Área' no pudo ser
 * localizado": el frontend espera la clave `area_id`, no `id`. Este test
 * fija ese contrato y verifica el fallback de claves Oracle en MAYÚSCULAS.
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\AreaResponseDTO;

echo "TC-10 — AreaResponseDTO expone area_id y soporta claves Oracle\n";

// Fila tal como la devuelve Oracle (columnas en MAYÚSCULAS).
$row = [
    'AREA_ID'    => '01HZX0AREA00000000000000AA',
    'NAME'       => 'Recursos Humanos',
    'DESCRIPTION'=> 'Área de RRHH',
    'CREATED_AT' => '28-MAY-26 05.34.02.776554 PM',
    'CREATED_BY' => '01HZX0USER00000000000000BB',
    'IS_DELETED' => 0,
    'DELETED_AT' => null,
];

$out = AreaResponseDTO::fromArray($row)->toArray();

tc_assert(array_key_exists('area_id', $out), 'TC-10', "toArray() expone la clave 'area_id'");
tc_assert(!array_key_exists('id', $out), 'TC-10', "toArray() NO expone la clave 'id' (contrato viejo)");
tc_assert($out['area_id'] === '01HZX0AREA00000000000000AA', 'TC-10', 'area_id se mapea desde AREA_ID');
tc_assert($out['name'] === 'Recursos Humanos', 'TC-10', 'name se mapea desde NAME');
tc_assert($out['is_deleted'] === 0, 'TC-10', 'is_deleted se castea a int');

// Mismo mapeo pero con claves en minúsculas (algunos repos las normalizan).
$lower = AreaResponseDTO::fromArray([
    'area_id'    => '01HZX0AREA00000000000000CC',
    'name'       => 'Finanzas',
    'description'=> null,
    'created_at' => '2026-05-28',
    'created_by' => '01HZX0USER00000000000000BB',
    'is_deleted' => 1,
    'deleted_at' => '2026-05-29',
])->toArray();

tc_assert($lower['area_id'] === '01HZX0AREA00000000000000CC', 'TC-10', 'area_id se mapea desde area_id (minúscula)');
tc_assert($lower['description'] === null, 'TC-10', 'description null se preserva');

echo "\033[32mTC-10 OK — AreaResponseDTO mantiene el contrato area_id\033[0m\n";
