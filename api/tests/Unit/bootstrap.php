<?php
declare(strict_types=1);

/**
 * Bootstrap for the PHPUnit unit suite.
 *
 * These tests exercise pure domain code (DTO validation and Oracle-row mapping)
 * and never touch the database, so this only wires up class autoloading: the
 * Composer autoload for dependencies plus the project's catch-all loader that
 * resolves namespaces like DTO\ and Http\ under src/.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

spl_autoload_register(static function (string $class): void {
    $base = realpath(__DIR__ . '/../../src');
    if ($base === false) {
        return;
    }
    $file = $base . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $class) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});
