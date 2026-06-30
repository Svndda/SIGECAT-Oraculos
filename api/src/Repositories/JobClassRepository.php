<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateJobClassDTO;
use DTO\UpdateJobClassDTO;
use PDO;
use PDOException;

/**
 * JobClassRepository
 *
 * Read access for JOB_CLASSES (occupational classes): listing for selection
 * and existence checks when assigning one to a user.
 *
 * @package Repositories
 */
final class JobClassRepository extends Repository
{
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
   * @param CreateJobClassDTO $dto       The validated data transfer object.
   * @param string       $createdBy The ULID of the user creating the record.
   * * @throws PDOException If a database execution error occurs.
   * @return string The generated ULID of the newly created job class.
   */
  public function create(CreateJobClassDTO $dto, string $createdBy): string
  {
    $jobClassId = UlidGenerator::generate();

    $sql = '
      INSERT INTO job_classes (
        job_class_id,
        job_class_code,
        name,
        description,
        created_by
      )
      VALUES (
        :v_job_class_id,
        :v_job_class_code,
        :v_name,
        :v_description,
        :v_created_by
      )
    ';

    $stmt = $this->db->prepare($sql);

    $stmt->execute([
      ':v_job_class_id' => $jobClassId,
      ':v_job_class_code' => $dto->jobClassCode,
      ':v_name' => $dto->name,
      ':v_description' => $dto->description,
      ':v_created_by' => $createdBy
    ]);

    return $jobClassId;
  }

  /**
   * Finds a specific job class by its ID.
   *
   * @param string $jobClassId  The ULID of the job class to locate.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return array<string, mixed>|null Associative array containing job class data, or null if not found.
   */
  public function findById(string $jobClassId, string $status = 'active'): ?array
  {

    $sql = '
      SELECT job_class_id, job_class_code, name, description, created_at, created_by, is_deleted, deleted_at
      FROM job_classes
      WHERE job_class_id = :v_job_class_id' . $this->statusCondition($status) . '
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);

    $stmt->execute([':v_job_class_id' => $jobClassId]);
    /** @var array<string, mixed>|false $row */
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? $row : null;
  }

  public function existsById(string $jobClassId): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM JOB_CLASSES WHERE job_class_id = :id'
    );
    $stmt->execute([':id' => $jobClassId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int)($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** @return array<int, array<string, mixed>> */
  public function getJobClasses(int $offset, int $limit, string $filter = ''
  ): array {
    $stmt = $this->db->prepare(
      'SELECT job_class_id, job_class_code, name, description, created_at, created_by
         FROM JOB_CLASSES
        WHERE UPPER(name) LIKE UPPER(:filter)
        ORDER BY name
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countJobClasses(string $filter = ''): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM JOB_CLASSES WHERE UPPER(name) LIKE UPPER(:filter)'
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int)($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  /**
   * Retrieves a paginated list of job class based on filters.
   *
   * @param int    $limit  Maximum number of records to return.
   * @param int    $offset Number of records to skip.
   * @param string $filter Search string to filter by job name.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return array<int, array<string, mixed>> List of associative arrays representing job class.
   */
  public function findAllPaginated(
    int $limit,
    int $offset,
    string $filter = '',
    string $status = 'active'
  ): array {
    $sql = '
        SELECT job_class_id, name, job_class_code, description, created_at, created_by, is_deleted, deleted_at 
        FROM job_classes
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
   * Counts the total number of job classes matching the current filter and status.
   *
   * @param string $filter Search string to filter by job class name.
   * @param string $status The logical deletion status filter. Defaults to 'active'.
   * * @throws PDOException If a database execution error occurs.
   * @return int The total count of matching job classes.
   */
  public function countAll(string $filter = '', string $status = 'active'): int
  {
    $sql = '
        SELECT COUNT(*) as total 
        FROM job_classes
        WHERE UPPER(name) LIKE UPPER(:v_filter)' . $this->statusCondition($status);

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? (int) ($row['total'] ?? $row['TOTAL'] ?? 0) : 0;
  }

  /**
   * Updates an existing job class record dynamically based on provided DTO fields.
   *
   * @param string       $jobClassId The ULID of the job to update.
   * @param UpdateJobClassDTO $dto   The validated data transfer object with partial updates.
   * * @throws PDOException If a database execution error occurs.
   * @return bool True if the query executes successfully.
   */
  public function update(string $jobClassId, UpdateJobClassDTO $dto): bool
  {
    $fields = [];
    $params = [':v_job_class_id' => $jobClassId];

    if ($dto->jobClassCode !== null) {
      $fields[] = 'job_class_code = :v_job_class_code';
      $params[':v_job_class_code'] = $dto->jobClassCode;
    }

    if ($dto->name !== null) {
      $fields[] = 'name = :v_name';
      $params[':v_name'] = $dto->name;
    }

    if ($dto->description !== null) {
      $fields[] = 'description = :v_description';
      $params[':v_description'] = $dto->description;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE job_classes SET ' . implode(', ', $fields)
      . ' WHERE job_class_id = :v_job_class_id AND is_deleted = 0';

    return $this->db->prepare($sql)->execute($params);
  }

  /**
   * Performs a soft delete on a specific job record.
   *
   * @param string $jobClassId     The ULID of the job class to delete.
   * @param string $deletedBy The ULID of the user performing the deletion.
   * * @throws PDOException If a database execution error occurs.
   * @return bool True if a record was modified, false otherwise.
   */
  public function delete(string $jobClassId, string $deletedBy): bool
  {
    $sql = '
        UPDATE job_classes
        SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :v_deleted_by
        WHERE job_class_id = :v_job_class_id AND is_deleted = 0
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_deleted_by' => $deletedBy,
      ':v_job_class_id' => $jobClassId
    ]);

    return $stmt->rowCount() > 0;
  }

  public function existsByCode(int $jobClassCode): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM JOB_CLASSES WHERE job_class_code = :code'
    );
    $stmt->execute([':code' => $jobClassCode]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int)($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }
}
