<?php

declare(strict_types=1);

/**
 * Builds the shared Oracle PDO connection.
 *
 * Credentials are resolved from environment variables first (DB_USERNAME,
 * DB_PASSWORD, DB_TNS_NAME) for containerized/production deployments, and fall
 * back to the gitignored config/oci_config.php for local development. The wallet
 * location is taken from TNS_ADMIN, set by the runtime (npm run api / Docker).
 */

/** Returns the env var, or null when unset/empty. */
$env = static function (string $key): ?string {
  $value = getenv($key);
  return ($value === false || $value === '') ? null : $value;
};

$username = $env('DB_USERNAME');
$password = $env('DB_PASSWORD');
$tnsName  = $env('DB_TNS_NAME');

// If any credential is missing from the environment, fill it from oci_config.php.
if ($username === null || $password === null || $tnsName === null) {
  $configFilePath = realpath(__DIR__ . '/oci_config.php');
  if (!$configFilePath || !file_exists($configFilePath)) {
    throw new \RuntimeException(
      "Database configuration missing: set DB_USERNAME/DB_PASSWORD/DB_TNS_NAME, " .
      "or provide config/oci_config.php."
    );
  }
  require_once $configFilePath;
  $username ??= OCIConfig::USERNAME;
  $password ??= OCIConfig::PASSWORD;
  $tnsName  ??= OCIConfig::TNSNAME;
}

try {
  $dsn = sprintf(
    "oci:dbname=%s;charset=AL32UTF8",
    $tnsName
  );

  $options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_CASE => PDO::CASE_LOWER,
    PDO::ATTR_EMULATE_PREPARES => false,
    // Reuse the Oracle connection across requests in the same PHP worker.
    // Opening a fresh wallet/TLS connection costs ~1.1s; persisting it means
    // only the first request per worker pays that, the rest reuse it.
    PDO::ATTR_PERSISTENT => true,
  ];

  $pdo = new PDO($dsn, $username, $password, $options);

  return $pdo;
} catch (\PDOException $e) {
  throw new \PDOException($e->getMessage(), (int) $e->getCode());
}
