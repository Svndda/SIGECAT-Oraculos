<?php
declare(strict_types=1);

/**
 * TC-16 — UpdateJobPositionDTO: actualización parcial
 *
 * El update soporta cambios parciales pero:
 *  - si toca el padre, sólo uno puede estar presente
 *  - debe haber al menos un campo actualizable
 *  - hasParent()/parent() reflejan el padre elegido
 */

require_once __DIR__ . '/bootstrap.php';

use DTO\UpdateJobPositionDTO;
use Http\ApiException;

echo "TC-16 — UpdateJobPositionDTO valida updates parciales\n";

// Update vacío: no hay nada que actualizar.
$thrown = null;
try {
    UpdateJobPositionDTO::fromArray([])->validate();
} catch (ApiException $e) {
    $thrown = $e;
}
tc_assert($thrown !== null, 'TC-16', 'update sin campos lanza ApiException');

// Dos padres a la vez: inválido.
$thrown = null;
try {
    UpdateJobPositionDTO::fromArray([
        'department_id' => '01HZX0DEPT00000000000000AA',
        'section_id'    => '01HZX0SECT00000000000000BB',
    ])->validate();
} catch (ApiException $e) {
    $thrown = $e;
}
tc_assert($thrown !== null, 'TC-16', 'dos padres en update lanza ApiException');

// Cambiar sólo la descripción: válido y sin padre.
$descOnly = UpdateJobPositionDTO::fromArray(['description' => 'Nueva descripción']);
$ok = true;
try {
    $descOnly->validate();
} catch (ApiException $e) {
    $ok = false;
}
tc_assert($ok, 'TC-16', 'update de sólo descripción pasa validate()');
tc_assert($descOnly->hasParent() === false, 'TC-16', 'hasParent() es false cuando no se toca el padre');

// Mover la plaza a una unidad: válido, hasParent() true, parent() correcto.
$moveUnit = UpdateJobPositionDTO::fromArray(['unit_id' => '01HZX0UNIT00000000000000EE']);
$ok = true;
try {
    $moveUnit->validate();
} catch (ApiException $e) {
    $ok = false;
}
tc_assert($ok, 'TC-16', 'mover plaza a unidad pasa validate()');
tc_assert($moveUnit->hasParent() === true, 'TC-16', 'hasParent() es true al cambiar el padre');
[$col, $id] = $moveUnit->parent();
tc_assert($col === 'unit_id' && $id === '01HZX0UNIT00000000000000EE', 'TC-16', 'parent() devuelve unit_id correcto');

echo "\033[32mTC-16 OK — UpdateJobPositionDTO maneja updates parciales\033[0m\n";
