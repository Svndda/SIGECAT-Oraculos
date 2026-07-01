<?php
declare(strict_types=1);

namespace Repositories;

use PDO;
use PDOException;

/**
 * RateLimitRepository
 *
 * Data access for RATE_LIMITS: fixed-window request counters keyed by an opaque
 * hash (see RateLimiter). Each call to {@see hit()} atomically advances the
 * counter for one bucket and returns the number of hits in the current window,
 * resetting the window once it has elapsed.
 *
 * @package Repositories
 */
final class RateLimitRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Records one hit against the bucket and returns the running count for the
   * current window. When the previous window has fully elapsed the counter is
   * restarted at 1. The row is locked FOR UPDATE so concurrent requests cannot
   * race the read-modify-write.
   *
   * @param string $key           Opaque bucket key (hashed action + identifier).
   * @param int    $windowSeconds  Length of the fixed window in seconds.
   * @return int The number of hits counted in the current window (>= 1).
   */
  public function hit(string $key, int $windowSeconds): int
  {
    $ownsTransaction = !$this->db->inTransaction();
    if ($ownsTransaction) {
      $this->beginTransaction();
    }

    try {
      $select = $this->db->prepare(
        "SELECT hits,
                CASE WHEN CURRENT_TIMESTAMP - window_start
                          >= NUMTODSINTERVAL(:win, 'SECOND')
                     THEN 1 ELSE 0 END AS expired
           FROM RATE_LIMITS
          WHERE rate_key = :key
            FOR UPDATE"
      );
      $select->execute([':win' => $windowSeconds, ':key' => $key]);
      $row = $select->fetch(PDO::FETCH_ASSOC);

      if ($row === false) {
        $hits = $this->insertBucket($key, $select, $windowSeconds);
      } else {
        $expired = (int) ($row['expired'] ?? $row['EXPIRED'] ?? 0) === 1;
        $hits = $expired ? 1 : (int) ($row['hits'] ?? $row['HITS'] ?? 0) + 1;
        $this->writeBucket($key, $hits, $expired);
      }

      if ($ownsTransaction) {
        $this->commit();
      }
      return $hits;
    } catch (\Throwable $e) {
      if ($ownsTransaction) {
        $this->rollBack();
      }
      throw $e;
    }
  }

  /**
   * Inserts a fresh bucket starting at 1 hit. If a concurrent request already
   * created it, re-reads the locked row and increments instead.
   *
   * @param \PDOStatement $select The locking SELECT to reuse on an insert race.
   */
  private function insertBucket(string $key, \PDOStatement $select, int $windowSeconds): int
  {
    try {
      $insert = $this->db->prepare(
        'INSERT INTO RATE_LIMITS (rate_key, window_start, hits)
         VALUES (:key, CURRENT_TIMESTAMP, 1)'
      );
      $insert->execute([':key' => $key]);
      return 1;
    } catch (PDOException $e) {
      // Lost the insert race: the row now exists, so count against it.
      $select->execute([':win' => $windowSeconds, ':key' => $key]);
      $row = $select->fetch(PDO::FETCH_ASSOC);
      if ($row === false) {
        throw $e;
      }
      $expired = (int) ($row['expired'] ?? $row['EXPIRED'] ?? 0) === 1;
      $hits = $expired ? 1 : (int) ($row['hits'] ?? $row['HITS'] ?? 0) + 1;
      $this->writeBucket($key, $hits, $expired);
      return $hits;
    }
  }

  /** Persists the new hit count, rolling the window forward when it expired. */
  private function writeBucket(string $key, int $hits, bool $resetWindow): void
  {
    $sql = $resetWindow
      ? 'UPDATE RATE_LIMITS SET hits = :hits, window_start = CURRENT_TIMESTAMP WHERE rate_key = :key'
      : 'UPDATE RATE_LIMITS SET hits = :hits WHERE rate_key = :key';
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':hits' => $hits, ':key' => $key]);
  }
}
