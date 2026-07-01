<?php
declare(strict_types=1);

/**
 * SIGECAT database migration runner.
 *
 * Applies the SQL files in /migrations in order, recording each in the
 * SCHEMA_MIGRATIONS table so it is applied exactly once. Reuses the API's PDO
 * configuration (config/database.php), so DB credentials come from the
 * environment or config/oci_config.php just like the app.
 *
 * Usage (from api/):
 *   php bin/migrate.php status     List applied and pending migrations.
 *   php bin/migrate.php migrate    Apply every pending migration, in order.
 *   php bin/migrate.php baseline   Mark all current migrations as applied
 *                                  WITHOUT running them (for a database that
 *                                  already has the schema).
 */

$root = dirname(__DIR__, 2);
$migrationsDir = $root . '/migrations';

// pdo_oci reads TNS_ADMIN at load time; mirror the app/tests fallback so the
// runner works from the CLI without exporting it by hand.
if (getenv('TNS_ADMIN') === false) {
    $wallet = realpath($root . '/instantclient-basic-linux.x64-21.12.0.0.0dbru.el9/instantclient_21_12/network/admin');
    if ($wallet !== false) {
        putenv('TNS_ADMIN=' . $wallet);
    }
}

/** @var PDO $pdo */
$pdo = require __DIR__ . '/../config/database.php';

$command = $argv[1] ?? 'status';

try {
    ensureMigrationsTable($pdo);
    $applied = appliedVersions($pdo);
    $all = migrationFiles($migrationsDir);
    $pending = array_values(array_filter($all, static fn(string $v) => !isset($applied[$v])));

    switch ($command) {
        case 'status':
            printStatus($all, $applied, $pending);
            break;
        case 'migrate':
            runMigrations($pdo, $migrationsDir, $pending);
            break;
        case 'baseline':
            baseline($pdo, $pending);
            break;
        default:
            fwrite(STDERR, "Unknown command '$command'. Use: status | migrate | baseline\n");
            exit(2);
    }
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}

/** Creates SCHEMA_MIGRATIONS if it does not exist (idempotent). */
function ensureMigrationsTable(PDO $pdo): void
{
    try {
        $pdo->exec(
            'CREATE TABLE SCHEMA_MIGRATIONS (
                version    VARCHAR2(255) NOT NULL,
                applied_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
                CONSTRAINT pk_schema_migrations PRIMARY KEY (version)
            )'
        );
    } catch (PDOException $e) {
        // ORA-00955: name already used by an existing object — already created.
        if (!str_contains($e->getMessage(), 'ORA-00955')) {
            throw $e;
        }
    }
}

/** @return array<string, true> Set of applied migration versions. */
function appliedVersions(PDO $pdo): array
{
    $rows = $pdo->query('SELECT version FROM SCHEMA_MIGRATIONS')->fetchAll(PDO::FETCH_COLUMN);
    $set = [];
    foreach ($rows as $version) {
        $set[(string) $version] = true;
    }
    return $set;
}

/** @return array<int, string> Migration file names (version ids), sorted. */
function migrationFiles(string $dir): array
{
    if (!is_dir($dir)) {
        throw new RuntimeException("Migrations directory not found: $dir");
    }
    $files = glob($dir . '/*.sql') ?: [];
    $names = array_map('basename', $files);
    sort($names);
    return $names;
}

function recordApplied(PDO $pdo, string $version): void
{
    $stmt = $pdo->prepare('INSERT INTO SCHEMA_MIGRATIONS (version) VALUES (:version)');
    $stmt->execute([':version' => $version]);
}

function runMigrations(PDO $pdo, string $dir, array $pending): void
{
    if ($pending === []) {
        echo "Nothing to migrate — database is up to date.\n";
        return;
    }
    foreach ($pending as $version) {
        echo "Applying $version ...\n";
        $sql = (string) file_get_contents($dir . '/' . $version);
        foreach (splitSqlStatements($sql) as $statement) {
            $pdo->exec($statement);
        }
        recordApplied($pdo, $version);
        echo "  done.\n";
    }
    echo 'Applied ' . count($pending) . " migration(s).\n";
}

function baseline(PDO $pdo, array $pending): void
{
    if ($pending === []) {
        echo "Nothing to baseline — all migrations are already recorded.\n";
        return;
    }
    foreach ($pending as $version) {
        recordApplied($pdo, $version);
        echo "Baselined $version\n";
    }
    echo 'Marked ' . count($pending) . " migration(s) as applied (not run).\n";
}

/** @param array<int, string> $all @param array<string, true> $applied @param array<int, string> $pending */
function printStatus(array $all, array $applied, array $pending): void
{
    echo "Migrations (" . count($all) . " total, " . count($applied) . " applied, " . count($pending) . " pending):\n";
    foreach ($all as $version) {
        $mark = isset($applied[$version]) ? '[x]' : '[ ]';
        echo "  $mark $version\n";
    }
}

/**
 * Splits an Oracle SQL script into individual statements, SQL*Plus style:
 * a line containing only '/' terminates a PL/SQL block, while ';' terminates a
 * plain statement (but not inside a PL/SQL block). Full-line comments and blank
 * lines between statements are skipped.
 *
 * @return array<int, string>
 */
function splitSqlStatements(string $sql): array
{
    $lines = preg_split('/\R/', $sql) ?: [];
    $statements = [];
    $buffer = '';
    $inPlsql = false;

    foreach ($lines as $line) {
        $trimmed = trim($line);

        if ($buffer === '' && ($trimmed === '' || str_starts_with($trimmed, '--'))) {
            continue;
        }

        if ($buffer === '' && preg_match('/^(CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)|DECLARE|BEGIN)\b/i', $trimmed)) {
            $inPlsql = true;
        }

        if ($trimmed === '/') {
            $stmt = trim($buffer);
            if ($stmt !== '') {
                $statements[] = $stmt;
            }
            $buffer = '';
            $inPlsql = false;
            continue;
        }

        $buffer .= $line . "\n";

        if (!$inPlsql && str_ends_with($trimmed, ';')) {
            $stmt = rtrim(trim($buffer), ';');
            $stmt = trim($stmt);
            if ($stmt !== '') {
                $statements[] = $stmt;
            }
            $buffer = '';
        }
    }

    $tail = trim($buffer);
    if ($tail !== '') {
        $statements[] = rtrim($tail, ';');
    }

    return $statements;
}
