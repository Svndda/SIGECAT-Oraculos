<?php
require_once __DIR__ . '/oci_config.php';

try {
  $dsn = "oci:dbname=" . OCIConfig::TNSNAME . ";charset=AL32UTF8";

  $options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ];

  $pdo = new PDO($dsn, OCIConfig::USERNAME, OCIConfig::PASSWORD, $options);
  echo "Connection successful to Oracle Cloud!\n";

  return $pdo;

} catch (\PDOException $e) {
  throw new \PDOException($e->getMessage(), (int) $e->getCode());
}

?>