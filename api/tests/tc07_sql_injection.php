<?php
declare(strict_types=1);

/**
 * TC-07 — UserRepository: prevención de inyección SQL
 * Espera: input malicioso es tratado como literal vía prepared statements;
 *         ni se ejecuta como SQL ni revienta la consulta.
 */

require_once __DIR__ . '/bootstrap.php';

use Sigecat\Api\Database\DatabaseFactory;
use Repositories\UserRepository;

echo "TC-07 — Prevención de inyección SQL en UserRepository\n";

$pdo = DatabaseFactory::getConnection();
$repo = new UserRepository($pdo);

$maliciousInput = "' OR 1=1 --";

$thrown = null;
$user = null;
try {
    $user = $repo->findByEmail($maliciousInput);
} catch (\Throwable $e) {
    $thrown = $e;
}

tc_assert($thrown === null, 'TC-07', 'la consulta no lanza excepción (entrada tratada como literal)');
tc_assert($user === null, 'TC-07', 'la consulta NO devuelve usuarios (la inyección no se ejecutó como SQL)');

// Confirmación adicional: verificar que el código del repositorio usa prepared statements.
$source = file_get_contents(__DIR__ . '/../src/Repositories/UserRepository.php');
tc_assert(is_string($source), 'TC-07', 'lectura de UserRepository.php');
tc_assert(strpos((string) $source, 'prepare(') !== false, 'TC-07', 'UserRepository usa prepare()');
tc_assert(preg_match('/:[a-zA-Z_]+/', (string) $source) === 1, 'TC-07', 'UserRepository usa parámetros nombrados (:name)');

echo "\033[32mTC-07 OK — entrada maliciosa neutralizada por prepared statements\033[0m\n";
