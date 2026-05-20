<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateDepartmentDTO;
use DTO\UpdateDepartmentDTO;
use PDO;

/**
 * Repository handling persistence operations for the DEPARTMENTS table.
 *
 * This class encapsulates all CRUD operations for departments, ensuring
 * seamless data handling and DTO-driven validation.
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
  public function findById(string $departmentId): ?array
  {
    $sql = '
        SELECT department_id, area_id, name, description, created_at, created_by
        FROM departments
        WHERE department_id = :v_department_id
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
    ];
  }

  /**
   * Fetches all records from the departments table.
   *
   * @return array<int, array<string, mixed>> List of departments with UPPERCASE keys.
   */
  public function findAll(): array
  {
    $sql = '
        SELECT department_id, area_id, name, description, created_at, created_by 
        FROM departments
        ORDER BY name ASC
    ';

    $stmt = $this->db->query($sql);
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

    $sql = 'UPDATE departments SET ' . implode(', ', $fields) . ' WHERE department_id = :v_department_id';

    $stmt = $this->db->prepare($sql);
    return $stmt->execute($params);
  }

  /**
   * Permanently deletes a department record by its unique identifier.
   *
   * @param string $departmentId The ULID identifier.
   * * @return bool True if a row was affected/deleted, false otherwise.
   */
  public function delete(string $departmentId): bool
  {
    $sql = 'DELETE FROM departments WHERE department_id = :v_department_id';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_department_id' => $departmentId]);

    return $stmt->rowCount() > 0;
  }
}