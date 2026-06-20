<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateJobDTO;
use DTO\UpdateJobDTO;
use PDO;
use PDOException;

/**
 * Class JobRepository
 * * Repository handling persistence operations for the JOBS table.
 * * @package Repositories
 */
final class JobRepository extends Repository
{
  /**
   * JobRepository constructor.
   *
   * @param PDO $db The active database connection instance.
   */
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Generates the SQL condition string for logical deletion filtering.
   *
   * @param string $status The requested status filter ('active', 'deleted', 'all').
   * @return string The SQL condition to append.
   */
  private function statusCondition(string $status): string
  {
    return match ($status) {
      'deleted' => ' AND is_deleted = 1',
      'all' => '',
      default => ' AND is_deleted = 0',
    };
  }

  /**
   * Persists a new job record to the database.
   *
   * @param CreateJobDTO $dto       The validated data transfer object.
   * @param string       $createdBy The ULID of the user creating the record.
   * * @throws PDOException If a database execution error occurs.
   * @return string The generated ULID of the newly created job.
   */
  public function create(CreateJobDTO $dto, string $createdBy): string
  {
    $jobId = UlidGenerator::generate();

    $sql = '
        INSERT INTO jobs (
          job_id, job_class_id, name, job_code, description, created_by
        )
        VALUES (
          :v_job_id, :v_job_class_id, :v_name, :v_job_code, :v_description, :v_created_by
        )
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_job_id' => $jobId,
      ':v_job_class_id' => $dto->jobClassId,
      ':v_name' => $dto->name,
      ':v_job_code' => $dto->job_code,
      ':v_description' => $dto->description,
      ':v_created_by' => $createdBy,
    ]);

    return $jobId;
  }

  /**
   * Finds a specific job by its ID.
   *
   * @param string $jobId  The ULID of the job to locate.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return array<string, mixed>|null Associative array containing job data, or null if not found.
   */
  public function findById(string $jobId, string $status = 'active'): ?array
  {
    $sql = '
        SELECT job_id, job_class_id, name, job_code, description, created_at, created_by, is_deleted, deleted_at
        FROM jobs
        WHERE job_id = :v_job_id' . $this->statusCondition($status) . '
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_job_id' => $jobId]);

    /** @var array<string, mixed>|false $row */
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? $row : null;
  }

  /**
   * Retrieves a paginated list of job based on filters.
   *
   * @param int    $limit  Maximum number of records to return.
   * @param int    $offset Number of records to skip.
   * @param string $filter Search string to filter by job name.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return array<int, array<string, mixed>> List of associative arrays representing job.
   */
  public function findAllPaginated(
    int $limit,
    int $offset,
    string $filter = '',
    string $status = 'active'
  ): array {
    $sql = '
        SELECT job_id, job_class_id, name, job_code, description, created_at, created_by, is_deleted, deleted_at 
        FROM jobs
        WHERE UPPER(name) LIKE UPPER(:v_filter)' . $this->statusCondition($status) . '
        ORDER BY created_at DESC
        OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    $stmt->bindValue(':v_offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':v_limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    /** @var array<int, array<string, mixed>> $result */
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $result;
  }

  /**
   * Counts the total number of job matching the current filter and status.
   *
   * @param string $filter Search string to filter by job name.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return int The total count of matching job.
   */
  public function countAll(string $filter = '', string $status = 'active'): int
  {
    $sql = '
        SELECT COUNT(*) as total 
        FROM jobs
        WHERE UPPER(name) LIKE UPPER(:v_filter)' . $this->statusCondition($status);

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? (int) ($row['total'] ?? $row['TOTAL'] ?? 0) : 0;
  }

  /**
   * Updates an existing job record dynamically based on provided DTO fields.
   *
   * @param string       $jobId The ULID of the job to update.
   * @param UpdateJobDTO $dto   The validated data transfer object with partial updates.
   * * @throws PDOException If a database execution error occurs.
   * @return bool True if the query executes successfully.
   */
  public function update(string $jobId, UpdateJobDTO $dto): bool
  {
    $fields = [];
    $params = [':v_job_id' => $jobId];

    if ($dto->jobClassId !== null) {
      $fields[] = 'job_class_id = :v_job_class_id';
      $params[':v_job_class_id'] = $dto->jobClassId;
    }

    if ($dto->name !== null) {
      $fields[] = 'name = :v_name';
      $params[':v_name'] = $dto->name;
    }

    if ($dto->job_code !== null) {
      $fields[] = 'job_code = :v_job_code';
      $params[':v_job_code'] = $dto->job_code;
    }

    if ($dto->description !== null) {
      $fields[] = 'description = :v_description';
      $params[':v_description'] = $dto->description;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE jobs SET ' . implode(', ', $fields)
      . ' WHERE job_id = :v_job_id AND is_deleted = 0';

    return $this->db->prepare($sql)->execute($params);
  }

  /**
   * Performs a soft delete on a specific job record.
   *
   * @param string $jobId     The ULID of the job to delete.
   * @param string $deletedBy The ULID of the user performing the deletion.
   * * @throws PDOException If a database execution error occurs.
   * @return bool True if a record was modified, false otherwise.
   */
  public function delete(string $jobId, string $deletedBy): bool
  {
    $sql = '
        UPDATE jobs
        SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :v_deleted_by
        WHERE job_id = :v_job_id AND is_deleted = 0
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_deleted_by' => $deletedBy,
      ':v_job_id' => $jobId
    ]);

    return $stmt->rowCount() > 0;
  }
}