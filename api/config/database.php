<?php

declare(strict_types=1);

$configFilePath = realpath(__DIR__ . '/oci_config.php');

if (!$configFilePath || !file_exists($configFilePath)) {
  throw new \RuntimeException("Critical configuration file 'oci_config.php' not found.");
}

require_once $configFilePath;

try {
  $dsn = sprintf(
    "oci:dbname=%s;charset=AL32UTF8",
    OCIConfig::TNSNAME
  );
  
  $options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_CASE => PDO::CASE_LOWER,
    PDO::ATTR_EMULATE_PREPARES => false,
  ];

  $pdo = new PDO($dsn, OCIConfig::USERNAME, OCIConfig::PASSWORD, $options);

  return $pdo;
} catch (\PDOException $e) {
  throw new \PDOException($e->getMessage(), (int) $e->getCode());
}
