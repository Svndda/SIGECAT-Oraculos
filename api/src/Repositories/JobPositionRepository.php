<?php
declare(strict_types=1);

namespace Repositories;

use PDO;
use PDOException;

/**
 * JobPositionRepository
 *
 * Data access for JOB_POSITIONS (plazas). A plaza is occupied by at most one
 * user through JOB_POSITIONS.user_id; the plaza's `name` is its "número de plaza".
 *
 * @package Repositories
 */
final class JobPositionRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Finds an active (non-deleted) plaza by its number (its `name`).
   *
   * @return array<string, mixed>|null
   */
  public function findActiveByName(string $name): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT job_position_id, name, user_id
         FROM JOB_POSITIONS
        WHERE name = :name AND is_deleted = 0 AND ROWNUM = 1'
    );
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? $row : null;
  }

  /**
   * Assigns the given plaza to a user, atomically releasing any other plaza the
   * user currently holds so a user occupies at most one plaza.
   */
  public function assignToUser(string $jobPositionId, string $userId): void
  {
    $this->beginTransaction();
    try {
      // Release the user's previously held plaza(s).
      $release = $this->db->prepare(
        'UPDATE JOB_POSITIONS SET user_id = NULL
          WHERE user_id = :user_id AND job_position_id <> :job_position_id'
      );
      $release->execute([':user_id' => $userId, ':job_position_id' => $jobPositionId]);

      // Assign the requested plaza to the user.
      $assign = $this->db->prepare(
        'UPDATE JOB_POSITIONS SET user_id = :user_id
          WHERE job_position_id = :job_position_id AND is_deleted = 0'
      );
      $assign->execute([':user_id' => $userId, ':job_position_id' => $jobPositionId]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
