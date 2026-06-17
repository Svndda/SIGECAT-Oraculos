<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateJobPositionDTO;
use DTO\UpdateJobPositionDTO;
use PDO;
use PDOException;

/**
 * JobPositionRepository
 *
 * Data access for JOB_POSITIONS (plazas). A plaza is occupied by at most one
 * user through JOB_POSITIONS.user_id; the plaza's `name` is its "número de plaza".
 *
 * Soft delete: rows are never physically removed; `is_deleted` marks state and
 * reads accept a status filter ('active' | 'deleted' | 'all').
 *
 * @package Repositories
 */
final class JobPositionRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /** Builds the SQL fragment that filters by logical-deletion state. */
  private function statusCondition(string $status): string
  {
    return match ($status) {
      'deleted' => ' AND is_deleted = 1',
      'all'     => '',
      default   => ' AND is_deleted = 0',
    };
  }

  /**
   * Creates a plaza attached to exactly one parent entity. The parent column
   * comes from a fixed whitelist (DTO::parent), so inlining it is safe; the
   * other three FK columns stay NULL to satisfy CHECK_JOB_POSITION_PARENT.
   */
  public function createJobPosition(string $createdBy, CreateJobPositionDTO $dto): void
  {
    $newId = UlidGenerator::generate();
    [$parentColumn, $parentId] = $dto->parent();

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        "INSERT INTO JOB_POSITIONS
           (job_position_id, {$parentColumn}, job_id, job_position_number, description, created_at, created_by)
         VALUES
           (:id, :parent_id, :type_id, :job_position_number, :description, CURRENT_TIMESTAMP, :created_by)"
      );
      $stmt->execute([
        ':id'                  => $newId,
        ':parent_id'           => $parentId,
        ':type_id'             => $dto->jobId,
        ':job_position_number' => trim($dto->jobPositionNumber),
        ':description' => $dto->description !== null ? trim($dto->description) : null,
        ':created_by'  => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Applies a partial update to a plaza. When the parent is being changed, the
   * chosen FK column is set and the other three are forced to NULL so the row
   * keeps satisfying CHECK_JOB_POSITION_PARENT. The parent column name comes
   * from a fixed whitelist (DTO::parent), so inlining it is safe.
   */
  public function updateJobPosition(string $jobPositionId, UpdateJobPositionDTO $dto): void
  {
    $fields = [];
    $params = [':id' => $jobPositionId];

    if ($dto->jobPositionNumber !== null) {
      $fields[] = 'job_position_number = :job_position_number';
      $params[':job_position_number'] = trim($dto->jobPositionNumber);
    }
    if ($dto->description !== null) {
      $fields[] = 'description = :description';
      $params[':description'] = trim($dto->description);
    }
    if ($dto->jobId !== null) {
      $fields[] = 'job_id = :type_id';
      $params[':type_id'] = $dto->jobId;
    }
    if ($dto->hasParent()) {
      [$parentColumn, $parentId] = $dto->parent();
      foreach (['area_id', 'department_id', 'section_id', 'unit_id'] as $column) {
        if ($column === $parentColumn) {
          $fields[] = "{$column} = :parent_id";
          $params[':parent_id'] = $parentId;
        } else {
          $fields[] = "{$column} = NULL";
        }
      }
    }

    if (empty($fields)) {
      return;
    }

    $sql = 'UPDATE JOB_POSITIONS SET ' . implode(', ', $fields)
         . ' WHERE job_position_id = :id AND is_deleted = 0';

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute($params);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** @return array<string, mixed>|null */
  public function findById(string $jobPositionId, string $status = 'active'): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT job_position_id, area_id, department_id, section_id, unit_id,
              job_id, job_position_number, description,
              user_id, created_at, created_by, is_deleted, deleted_at
         FROM JOB_POSITIONS
        WHERE job_position_id = :id' . $this->statusCondition($status) . '
          AND ROWNUM = 1'
    );
    $stmt->execute([':id' => $jobPositionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Whether an active plaza already uses the given name (case-insensitive).
   */
  public function existsByNumber(string $name, ?string $excludeId = null): bool
  {
    $sql = 'SELECT COUNT(*) AS cnt FROM JOB_POSITIONS
            WHERE UPPER(job_position_number) = UPPER(:job_position_number) AND is_deleted = 0';
    $params = [':job_position_number' => $name];
    if ($excludeId !== null) {
      $sql .= ' AND job_position_id <> :id';
      $params[':id'] = $excludeId;
    }
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** @return array<int, array<string, mixed>> */
  public function getJobPositions(int $offset, int $limit, string $filter = '', string $status = 'active'): array
  {
    $stmt = $this->db->prepare(
      'SELECT job_position_id, area_id, department_id, section_id, unit_id,
              job_id, job_position_number, description,
              user_id, created_at, created_by, is_deleted, deleted_at
         FROM JOB_POSITIONS
        WHERE UPPER(job_position_number) LIKE UPPER(:filter)' . $this->statusCondition($status) . '
        ORDER BY created_at DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countJobPositions(string $filter = '', string $status = 'active'): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM JOB_POSITIONS
        WHERE UPPER(job_position_number) LIKE UPPER(:filter)' . $this->statusCondition($status)
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  /** Soft-deletes a plaza. */
  public function deleteJobPosition(string $jobPositionId, string $deletedBy): void
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE JOB_POSITIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE job_position_id = :id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':id' => $jobPositionId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** @return array<int, array<string, mixed>> Job position types (id + name). */
  public function listTypes(): array
  {
    $stmt = $this->db->prepare(
      'SELECT job_id, name FROM JOBS ORDER BY name'
    );
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Finds an active (non-deleted) plaza by its number (its `name`).
   *
   * @return array<string, mixed>|null
   */
  public function findActiveByName(string $name): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT job_position_id, job_position_number, user_id
         FROM JOB_POSITIONS
        WHERE job_position_number = :job_position_number AND is_deleted = 0 AND ROWNUM = 1'
    );
    $stmt->execute([':job_position_number' => $name]);
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
