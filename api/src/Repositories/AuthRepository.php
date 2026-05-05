<?php
declare(strict_types=1);

namespace Repositories;

use DTO\RefreshTokenDTO;
use DTO\AccessTokenDTO;
use DTO\TokensRotationDTO;
use PDO;
use Throwable;

/**
 * Repository handling persistence operations for authentication tokens.
 *
 * This class manages access and refresh tokens, ensuring atomic operations
 * for token rotation, validation, and revocation. All token hashes are
 * stored and compared, never raw tokens.
 *
 * @package Repositories
 */
final class AuthRepository extends Repository
{

  /**
   * Constructs the AuthRepository with a database connection.
   *
   * @param PDO $db The active PDO database connection.
   */
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Atomically replaces all tokens for a user with new ones.
   *
   * The operation runs inside a database transaction to ensure consistency.
   * If any step fails, all changes are rolled back.
   *
   * @param TokensRotationDTO $data Container holding the user ID and the new
   *                               access and refresh token DTOs.
   *
   * @throws Throwable Re-throws any exception that occurs during the
   *                   transaction after performing a rollback.
   */
  public function rotateTokensAtomic(TokensRotationDTO $data): void
  {
    try {
      $this->beginTransaction();

      $userId = $data->refreshToken->userId;
      $this->deleteUserTokens($userId);

      $this->upsertAccessToken($data->accessToken);
      $this->upsertRefreshToken($data->refreshToken);

      $this->commit();
    } catch (Throwable $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Inserts or updates an access token for a user.
   *
   * If an access token already exists for the given user, it is replaced.
   * The `updated_at` timestamp is set to the current time.
   *
   * @param AccessTokenDTO $data Access token data (user ID, hash, TTL).
   *
   * @return void
   */
  private function upsertAccessToken(AccessTokenDTO $data): void
  {
    $stmt = $this->db->prepare('
        INSERT INTO access_tokens (user_id, token_hash, expires_at, updated_at)
        VALUES (
        :user_id, :token_hash, DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW()
        )
        ON DUPLICATE KEY UPDATE
            token_hash = VALUES(token_hash),
            expires_at = VALUES(expires_at),
            updated_at = NOW()
    ');
    $stmt->execute([
      'user_id' => $data->userId,
      'token_hash' => $data->tokenHash,
      'ttl' => $data->ttlSeconds
    ]);
  }

  /**
   * Inserts or updates a refresh token for a user.
   *
   * If a refresh token already exists for the given user, it is replaced.
   *
   * @param RefreshTokenDTO $data Refresh token data (user ID, hash, TTL).
   *
   * @return void
   */
  private function upsertRefreshToken(RefreshTokenDTO $data): void
  {
    $stmt = $this->db->prepare('
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, updated_at)
        VALUES (
        :user_id, :token_hash, DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW()
        )
        ON DUPLICATE KEY UPDATE
            token_hash = VALUES(token_hash),
            expires_at = VALUES(expires_at),
            updated_at = NOW()
    ');
    $stmt->execute([
      'user_id' => $data->userId,
      'token_hash' => $data->tokenHash,
      'ttl' => $data->ttlSeconds
    ]);
  }

  /**
   * Finds a non‑expired, non‑revoked refresh token by its hash.
   *
   * @param string $tokenHash SHA‑256 hash of the raw refresh token.
   *
   * @return array<string, string>|null
   */
  public function findValidRefreshToken(string $tokenHash): ?array
  {
    $stmt = $this->db->prepare('
        SELECT user_id, token_hash, expires_at, revoked_at
        FROM refresh_tokens
        WHERE token_hash = :hash
          AND expires_at > NOW()
          AND revoked_at IS NULL
        LIMIT 1
    ');

    $stmt->execute(['hash' => $tokenHash]);
    $tokenRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tokenRow) {
      return null;
    }

    return [
      'user_id' => $tokenRow['user_id'],
      'token_hash' => $tokenRow['token_hash'],
      'expires_at' => $tokenRow['expires_at']
    ];
  }

  /**
   * Finds a non‑expired, non‑revoked access token by its hash.
   *
   * @param string $tokenHash SHA‑256 hash of the raw access token.
   *
   * @return array<string, string>|null
   */
  public function findValidAccessToken(string $tokenHash): ?array
  {
    $stmt = $this->db->prepare('
        SELECT user_id, token_hash, expires_at, revoked_at
        FROM access_tokens
        WHERE token_hash = :hash
          AND expires_at > NOW()
          AND revoked_at IS NULL
        LIMIT 1
    ');

    $stmt->execute(['hash' => $tokenHash]);
    $tokenRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tokenRow) {
      return null;
    }

    return [
      'user_id' => $tokenRow['user_id'],
      'token_hash' => $tokenRow['token_hash'],
      'expires_at' => $tokenRow['expires_at']
    ];
  }

  /**
   * Retrieves an access token by its hash regardless of expiry or revocation.
   *
   * This method is primarily intended for cleanup operations (e.g., logout)
   * when the token might have already expired.
   *
   * @param string $tokenHash SHA‑256 hash of the access token.
   *
   * @return array<string, string|null>|null
   */
  public function findAccessTokenByHash(string $tokenHash): ?array
  {
    $stmt = $this->db->prepare('
        SELECT user_id, token_hash, expires_at, revoked_at
        FROM access_tokens
        WHERE token_hash = :hash
        LIMIT 1
    ');

    $stmt->execute(['hash' => $tokenHash]);
    $tokenRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tokenRow) {
      return null;
    }

    return [
      'user_id' => $tokenRow['user_id'],
      'token_hash' => $tokenRow['token_hash'],
      'expires_at' => $tokenRow['expires_at'],
      'revoked_at' => $tokenRow['revoked_at']
    ];
  }

  /**
   * Permanently deletes a refresh token by its hash.
   *
   * @param string $hash SHA‑256 hash of the refresh token to delete.
   *
   * @return void
   */
  public function revokeRefreshToken(string $hash): void
  {
    $this->db->prepare(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :hash'
    )->execute(['hash' => $hash]);
  }

  /**
   * Removes all access and refresh tokens belonging to a user.
   *
   * @param string $userId The ULID (CHAR(26)) of the user.
   *
   * @return void
   */
  public function deleteUserTokens(string $userId): void
  {
    $this->db->prepare(
      'DELETE FROM access_tokens WHERE user_id = :uid'
    )->execute(['uid' => $userId]);

    $this->db->prepare(
      'DELETE FROM refresh_tokens WHERE user_id = :uid'
    )->execute(['uid' => $userId]);
  }

}
