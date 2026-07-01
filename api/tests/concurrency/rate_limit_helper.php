<?php
declare(strict_types=1);

/**
 * Support helper for the login rate-limiter concurrency test.
 *
 * Usage:
 *   php rate_limit_helper.php reset <email>   Clears RATE_LIMITS and resets the
 *                                             user's failed-login counter.
 *   php rate_limit_helper.php report <email>  Prints the max RATE_LIMITS.hits and
 *                                             the user's failed_logging_attempts.
 *
 * Reads the same Oracle connection the API uses.
 */

$pdo = require __DIR__ . '/../../config/database.php';
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$cmd = $argv[1] ?? '';
$email = $argv[2] ?? '';

switch ($cmd) {
  case 'reset':
    $pdo->exec('DELETE FROM rate_limits');
    $stmt = $pdo->prepare('UPDATE users SET failed_logging_attempts = 0, last_failed_attempt_at = NULL WHERE email = :e');
    $stmt->execute([':e' => $email]);
    echo "reset ok\n";
    break;

  case 'report':
    $maxHits = (int) $pdo->query('SELECT NVL(MAX(hits),0) FROM rate_limits')->fetchColumn();
    $stmt = $pdo->prepare('SELECT failed_logging_attempts FROM users WHERE email = :e');
    $stmt->execute([':e' => $email]);
    $failed = (int) $stmt->fetchColumn();
    echo "rate_limits_max_hits=$maxHits\n";
    echo "user_failed_attempts=$failed\n";
    break;

  default:
    fwrite(STDERR, "unknown command\n");
    exit(1);
}
