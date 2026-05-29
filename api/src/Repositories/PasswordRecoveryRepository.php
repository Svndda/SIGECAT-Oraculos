<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use PDO;
use PDOException;

/**
 * PasswordRecoveryRepository
 *
 * Handles persistence for password reset tokens.
 * Tokens are stored as SHA-256 hex digests; the raw token
 * is never persisted and is sent only to the user's email.
 */
final class PasswordRecoveryRepository extends Repository {

  public function __construct(PDO $db) {
    parent::__construct($db);
  }

  /**
   * Deletes any existing reset tokens for the user and inserts a fresh one.
   * Enforces a single active token per user at all times.
   */
  public function createToken(string $userId, string $tokenHash, int $ttlSeconds): void {
    $expiresAt = date('Y-m-d H:i:s', time() + $ttlSeconds);

    $this->beginTransaction();
    try {
      $this->db->prepare(
        'DELETE FROM PASSWORD_RESET_TOKENS WHERE user_id = :user_id'
      )->execute([':user_id' => $userId]);

      $stmt = $this->db->prepare(
        'INSERT INTO PASSWORD_RESET_TOKENS
           (token_id, user_id, token_hash, expires_at, created_at)
         VALUES
           (:token_id, :user_id, :token_hash,
            TO_TIMESTAMP(:expires_at, \'YYYY-MM-DD HH24:MI:SS\'),
            CURRENT_TIMESTAMP)'
      );
      $stmt->execute([
        ':token_id'   => UlidGenerator::generate(),
        ':user_id'    => $userId,
        ':token_hash' => $tokenHash,
        ':expires_at' => $expiresAt,
      ]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Returns a valid (non-expired, unused) token row or null.
   *
   * @return array{token_id: string, user_id: string}|null
   */
  public function findValidToken(string $tokenHash): ?array {
    $stmt = $this->db->prepare(
      'SELECT token_id, user_id
       FROM PASSWORD_RESET_TOKENS
       WHERE token_hash = :token_hash
         AND expires_at > CURRENT_TIMESTAMP
         AND used_at IS NULL
         AND ROWNUM = 1'
    );
    $stmt->execute([':token_hash' => $tokenHash]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row === false) {
      return null;
    }

    return [
      'token_id' => (string) ($row['TOKEN_ID'] ?? $row['token_id']),
      'user_id'  => (string) ($row['USER_ID']  ?? $row['user_id']),
    ];
  }

  /**
   * Marks a token as consumed so it cannot be reused.
   */
  public function markTokenAsUsed(string $tokenId): void {
    $this->beginTransaction();
    try {
      $this->db->prepare(
        'UPDATE PASSWORD_RESET_TOKENS
         SET used_at = CURRENT_TIMESTAMP
         WHERE token_id = :token_id'
      )->execute([':token_id' => $tokenId]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
