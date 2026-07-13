<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateOfficialFunctionDTO;
use DTO\UpdateOfficialFunctionDTO;
use PDO;
use PDOException;

/**
 * OfficialFunctionRepository
 *
 * Data access for OFFICIAL_FUNCTIONS: the catalogue of official functions. Each
 * function belongs to exactly one JOB ("tipo de puesto") through job_id.
 *
 * Soft delete: rows are never physically removed; `is_deleted` marks state and
 * reads accept a status filter ('active' | 'deleted' | 'all').
 *
 * @package Repositories
 */
final class OfficialFunctionRepository extends Repository
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

  /** Creates an official function bound to a job. */
  public function createOfficialFunction(string $createdBy, CreateOfficialFunctionDTO $dto): void
  {
    $newId = UlidGenerator::generate();

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO OFFICIAL_FUNCTIONS
           (official_function_id, job_id, name, description, expected_time, created_at, created_by)
         VALUES
           (:id, :job_id, :name, :description, :expected_time, CURRENT_TIMESTAMP, :created_by)'
      );
      $stmt->execute([
        ':id'            => $newId,
        ':job_id'        => $dto->jobId,
        ':name'          => trim($dto->name),
        ':description'   => $dto->description !== null ? trim($dto->description) : null,
        ':expected_time' => $dto->expectedTime,
        ':created_by'    => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Applies a partial update to an official function. Only provided fields are
   * touched; expected_time can be explicitly cleared (set to NULL) when the
   * caller sends it empty.
   */
  public function updateOfficialFunction(string $officialFunctionId, UpdateOfficialFunctionDTO $dto): void
  {
    $fields = [];
    $params = [':id' => $officialFunctionId];

    if ($dto->name !== null) {
      $fields[] = 'name = :name';
      $params[':name'] = trim($dto->name);
    }
    if ($dto->description !== null) {
      $fields[] = 'description = :description';
      $params[':description'] = trim($dto->description);
    }
    if ($dto->jobId !== null) {
      $fields[] = 'job_id = :job_id';
      $params[':job_id'] = $dto->jobId;
    }
    if ($dto->expectedTimeProvided) {
      $fields[] = 'expected_time = :expected_time';
      $params[':expected_time'] = $dto->expectedTime;
    }

    if (empty($fields)) {
      return;
    }

    $sql = 'UPDATE OFFICIAL_FUNCTIONS SET ' . implode(', ', $fields)
         . ' WHERE official_function_id = :id AND is_deleted = 0';

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
  public function findById(string $officialFunctionId, string $status = 'active'): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT official_function_id, name, description, job_id,
              expected_time, created_at, created_by, is_deleted, deleted_at
         FROM OFFICIAL_FUNCTIONS
        WHERE official_function_id = :id' . $this->statusCondition($status) . '
          AND ROWNUM = 1'
    );
    $stmt->execute([':id' => $officialFunctionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Whether an active official function with the given name already exists
   * within the same job (case-insensitive). The name is unique per job, not
   * globally: the same generic function name may be reused across different
   * "tipos de puesto".
   */
  public function existsByName(string $name, string $jobId, ?string $excludeId = null): bool
  {
    $sql = 'SELECT COUNT(*) AS cnt FROM OFFICIAL_FUNCTIONS
            WHERE UPPER(name) = UPPER(:name)
              AND job_id = :job_id
              AND is_deleted = 0';
    $params = [':name' => $name, ':job_id' => $jobId];
    if ($excludeId !== null) {
      $sql .= ' AND official_function_id <> :id';
      $params[':id'] = $excludeId;
    }
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** Soft-deletes an official function. */
  public function deleteOfficialFunction(string $officialFunctionId, string $deletedBy): void
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE OFFICIAL_FUNCTIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE official_function_id = :id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':id' => $officialFunctionId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** Whether the given active job exists ("válido según normativa"). */
  public function jobExists(string $jobId): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM JOBS
        WHERE job_id = :id AND is_deleted = 0'
    );
    $stmt->execute([':id' => $jobId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /**
   * Number of distinct declarations that already contain this official function
   * (through JOB_FUNCTIONS). Used to block deletion and to warn on update.
   */
  public function countDeclarationsContaining(string $officialFunctionId): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(DISTINCT declaration_id) AS cnt
         FROM JOB_FUNCTIONS
        WHERE official_function_id = :id'
    );
    $stmt->execute([':id' => $officialFunctionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0);
  }

  /**
   * Fetches a page of official functions along with the total matching row
   * count, in a single round trip (COUNT(*) OVER()) instead of a separate
   * COUNT(*) query.
   *
   * @return array{data: list<array<string, mixed>>, total: int}
   */
  public function getOfficialFunctions(int $offset, int $limit, string $filter = '', string $status = 'active', ?string $jobId = null): array
  {
    $jobCondition = $jobId !== null ? ' AND job_id = :job_id' : '';
    $stmt = $this->db->prepare(
      'SELECT official_function_id, name, description, job_id,
              expected_time, created_at, created_by, is_deleted, deleted_at,
              COUNT(*) OVER() AS total_count
         FROM OFFICIAL_FUNCTIONS
        WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status) . $jobCondition . '
        ORDER BY created_at DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    if ($jobId !== null) {
      $stmt->bindValue(':job_id', $jobId);
    }
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $this->splitWindowedTotal($stmt->fetchAll(PDO::FETCH_ASSOC));
  }
}
