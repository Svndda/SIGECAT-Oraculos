<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateDepartmentDTO;
use DTO\UpdateDepartmentDTO;
use PDO;
use PDOException;

/**
 * Repository handling persistence operations for the DEPARTMENTS table.
 *
 * This class encapsulates all CRUD operations for departments, ensuring
 * seamless data handling and DTO-driven validation.
 *
 * Soft delete: rows are never physically removed. `is_deleted` marks the
 * logical state; reads default to active rows only and accept a status
 * filter ('active' | 'deleted' | 'all').
 *
 * @package Repositories
 */
final class DepartmentRepository extends Repository
{
  /**
   * Constructs the DepartmentRepository with an active database connection.
   *
   * @param PDO $db The active PDO database connection.
   */
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Builds the SQL fragment that filters by logical-deletion state.
   * The value is an internal enum (never user input), so inlining is safe.
   */
  private function statusCondition(string $status): string
  {
    return match ($status) {
      'deleted' => ' AND is_deleted = 1',
      'all'     => '',
      default   => ' AND is_deleted = 0',
    };
  }

  /**
   * Persists a new department record into the database.
   *
   * @param CreateDepartmentDTO $dto Validated data container for creation.
   * @param string $createdBy The ULID (CHAR(26)) of the user performing the action.
   * * @return string The generated department_id (ULID) of the new record.
   */
  public function create(CreateDepartmentDTO $dto, string $createdBy): string
  {
    $departmentId = UlidGenerator::generate();

    $sql = '
        INSERT INTO departments (
          department_id, area_id, name, description, created_by
        )
        VALUES (
          :v_department_id, :v_area_id, :v_name, :v_description, :v_created_by
        )
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_department_id' => $departmentId,
      ':v_area_id' => $dto->areaId,
      ':v_name' => $dto->name,
      ':v_description' => $dto->description,
      ':v_created_by' => $createdBy,
    ]);

    return $departmentId;
  }

  /**
   * Retrieves a single department record by its unique identifier.
   *
   * @param string $departmentId The ULID identifier.
   * * @return array<string, mixed>|null Associative array with UPPERCASE keys or null if not found.
   */
  public function findById(string $departmentId, string $status = 'active'): ?array
  {
    $sql = '
        SELECT department_id, area_id, name, description, created_at, created_by, is_deleted, deleted_at
        FROM departments
        WHERE department_id = :v_department_id' . $this->statusCondition($status) . '
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_department_id' => $departmentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return [
      'department_id' => $row['department_id'],
      'area_id' => $row['area_id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'created_at' => $row['created_at'],
      'created_by' => $row['created_by'],
      'is_deleted' => $row['is_deleted'],
      'deleted_at' => $row['deleted_at'],
    ];
  }

  /**
   * Fetches records from the departments table.
   *
   * @param string $status One of active|deleted|all (default active).
   * @return array<int, array<string, mixed>> List of departments.
   */
  public function findAll(string $status = 'active'): array
  {
    $sql = '
        SELECT department_id, area_id, name, description, created_at, created_by, is_deleted, deleted_at
        FROM departments
        WHERE 1 = 1' . $this->statusCondition($status) . '
        ORDER BY name ASC
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Performs a partial or full update on an existing department.
   *
   * Dynamically constructs the query depending on the fields present (non-null) 
   * inside the UpdateDepartmentDTO wrapper.
   *
   * @param UpdateDepartmentDTO $dto Validated data container for updates.
   * * @return bool True if the record was updated successfully, false otherwise.
   */
  public function update(UpdateDepartmentDTO $dto): bool
  {
    $fields = [];
    $params = [':v_department_id' => $dto->departmentId];

    if ($dto->areaId !== null) {
      $fields[] = 'area_id = :v_area_id';
      $params[':v_area_id'] = $dto->areaId;
    }

    if ($dto->name !== null) {
      $fields[] = 'name = :v_name';
      $params[':v_name'] = $dto->name;
    }

    if ($dto->description !== null) {
      $fields[] = 'description = :v_description';
      $params[':v_description'] = $dto->description;
    }

    // If no updatable fields were specified, return false.
    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE departments SET ' . implode(', ', $fields)
         . ' WHERE department_id = :v_department_id AND is_deleted = 0';

    $stmt = $this->db->prepare($sql);
    return $stmt->execute($params);
  }

  /**
   * Soft-deletes a department and cascades to its child units, all in one
   * transaction. Plazas (JOB_POSITIONS) that pointed to the department or its
   * units are de-referenced (set to NULL) so they re-anchor to the area and
   * are not left floating. See docs/soft-delete-design.md §6/§7.
   *
   * @param string $departmentId The ULID identifier.
   * @param string $deletedBy    ULID of the user performing the deletion.
   * @return bool True if the department row was soft-deleted.
   */
  public function delete(string $departmentId, string $deletedBy): bool
  {
    $this->beginTransaction();
    try {
      // De-reference plazas pointing to this department's units.
      $stmt = $this->db->prepare(
        'UPDATE job_positions
            SET unit_id = NULL
          WHERE unit_id IN (SELECT unit_id FROM units WHERE department_id = :v_department_id)'
      );
      $stmt->execute([':v_department_id' => $departmentId]);

      // De-reference plazas pointing to the department itself.
      $stmt = $this->db->prepare(
        'UPDATE job_positions
            SET department_id = NULL
          WHERE department_id = :v_department_id'
      );
      $stmt->execute([':v_department_id' => $departmentId]);

      // Soft-delete child units.
      $stmt = $this->db->prepare(
        'UPDATE units
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :v_deleted_by
          WHERE department_id = :v_department_id AND is_deleted = 0'
      );
      $stmt->execute([':v_deleted_by' => $deletedBy, ':v_department_id' => $departmentId]);

      // Soft-delete the department itself.
      $stmt = $this->db->prepare(
        'UPDATE departments
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :v_deleted_by
          WHERE department_id = :v_department_id AND is_deleted = 0'
      );
      $stmt->execute([':v_deleted_by' => $deletedBy, ':v_department_id' => $departmentId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Restores a soft-deleted department (only the department itself; child
   * units stay deleted and are restored individually).
   *
   * @param string $departmentId The ULID identifier.
   * @return bool True if a deleted department row was restored.
   */
  public function restore(string $departmentId): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE departments
            SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE department_id = :v_department_id AND is_deleted = 1'
      );
      $stmt->execute([':v_department_id' => $departmentId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}