<?php
declare(strict_types=1);

/**
 * Runs every tcXX_*.php script in this directory and prints a summary.
 * Each TC is executed in its own process so a failure does not abort the rest.
 */

$dir = __DIR__;
$files = glob($dir . '/tc*_*.php') ?: [];
sort($files);

// Set TNS_ADMIN here (parent) so spawned PHP children inherit it via env.
// PDO_OCI / OCI8 read TNS_ADMIN at module load time, not from putenv() inside
// the same process, so it must be set before each child starts.
if (getenv('TNS_ADMIN') === false) {
    $wallet = realpath(__DIR__ . '/../../instantclient-basic-linux.x64-21.12.0.0.0dbru.el9/instantclient_21_12/network/admin');
    if ($wallet !== false) {
        putenv('TNS_ADMIN=' . $wallet);
    }
}

if (count($files) === 0) {
    echo "No test files found in $dir\n";
    exit(1);
}

$passed = [];
$failed = [];
$skipped = [];

foreach ($files as $file) {
    $name = basename($file);
    echo "\n────────────────────────────────────────\n";
    echo "▶ $name\n";
    echo "────────────────────────────────────────\n";

    passthru(PHP_BINARY . ' ' . escapeshellarg($file), $exitCode);

    if ($exitCode === 0) {
        $passed[] = $name;
    } elseif ($exitCode === 2) {
        $skipped[] = $name;
    } else {
        $failed[] = $name;
    }
}

echo "\n========================================\n";
echo "Resumen de pruebas\n";
echo "========================================\n";
printf("\033[32mPassed:  %d\033[0m\n", count($passed));
printf("\033[31mFailed:  %d\033[0m\n", count($failed));
printf("\033[33mSkipped: %d\033[0m\n", count($skipped));

if (count($failed) > 0) {
    echo "\nFallaron:\n";
    foreach ($failed as $f) echo "  - $f\n";
}
if (count($skipped) > 0) {
    echo "\nOmitidas (server no disponible):\n";
    foreach ($skipped as $s) echo "  - $s\n";
}

exit(count($failed) > 0 ? 1 : 0);
