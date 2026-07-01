<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateUnitDTO;
use DTO\UpdateUnitDTO;
use PDO;
use PDOException;

/**
 * UnitRepository
 *
 * Handles all database operations related to the UNITS table.
 * Encapsulates SQL, uses prepared statements, and enforces ACID
 * on write operations.
 *
 * A unit belongs to a section OR a department (section_id / department_id,
 * both nullable). It is a leaf in the organization hierarchy.
 *
 * Soft delete: rows are never physically removed. `is_deleted` marks the
 * logical state; reads default to active rows only and accept a status
 * filter ('active' | 'deleted' | 'all').
 */
final class UnitRepository extends Repository {

  public function __construct(PDO $db) {
    parent::__construct($db);
  }

  /**
   * Builds the SQL fragment that filters by logical-deletion state.
   * The value is an internal enum (never user input), so inlining is safe.
   */
  private function statusCondition(string $status): string {
    return match ($status) {
      'deleted' => ' AND is_deleted = 1',
      'all'     => '',
      default   => ' AND is_deleted = 0',
    };
  }

  /**
   * Retrieves a single unit by its identifier.
   *
   * @return array<string, mixed>|null
   */
  public function findById(string $unitId, string $status = 'active'): ?array {
    $stmt = $this->db->prepare(
      'SELECT unit_id, section_id, department_id, name, description,
              created_at, created_by, is_deleted, deleted_at
       FROM UNITS
       WHERE unit_id = :unit_id' . $this->statusCondition($status) . '
       AND ROWNUM = 1'
    );
    $stmt->execute([':unit_id' => $unitId]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Checks whether an ACTIVE unit already uses the given name
   * (case-insensitive), optionally excluding one unit id.
   * Deleted units are ignored so their names can be reused.
   */
  public function existsByName(string $name, ?string $excludeUnitId = null): bool {
    if ($excludeUnitId !== null) {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM UNITS
         WHERE UPPER(name) = UPPER(:name)
         AND unit_id <> :unit_id
         AND is_deleted = 0
         AND deleted_at is NULL'
      );
      $stmt->execute([':name' => $name, ':unit_id' => $excludeUnitId]);
    } else {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM UNITS
         WHERE UPPER(name) = UPPER(:name)
         AND is_deleted = 0'
      );
      $stmt->execute([':name' => $name]);
    }

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $count = (int) ($row['cnt'] ?? $row['CNT'] ?? 0);
    return $count > 0;
  }

  /**
   * Returns units whose name contains the given filter (case-insensitive).
   *
   * @return array<int, array<string, mixed>>
   */
  public function findByNameContaining(string $filter, string $status = 'active'): array {
    $stmt = $this->db->prepare(
      'SELECT unit_id, section_id, department_id, name, description,
              created_at, created_by, is_deleted, deleted_at
       FROM UNITS
       WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status) . '
       ORDER BY created_at DESC'
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Returns a paginated, optionally filtered list of units.
   *
   * @return array<int, array<string, mixed>>
   */
  public function getUnits(int $offset, int $limit, string $filter = '', string $status = 'active'): array {
    $stmt = $this->db->prepare(
      'SELECT unit_id, section_id, department_id, name, description,
              created_at, created_by, is_deleted, deleted_at
       FROM UNITS
       WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status) . '
       ORDER BY created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Counts units matching the filter and status (for pagination meta).
   */
  public function countUnits(string $filter = '', string $status = 'active'): int {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total
       FROM UNITS
       WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status)
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  /**
   * Inserts a new unit and returns its generated id.
   */
  public function createUnit(string $createdBy, CreateUnitDTO $dto): string {
    $newUnitId = UlidGenerator::generate();
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO UNITS (unit_id, section_id, department_id, name, description, created_at, created_by)
         VALUES (:unit_id, :section_id, :department_id, :name, :description, CURRENT_TIMESTAMP, :created_by)'
      );
      $stmt->execute([
        ':unit_id'       => $newUnitId,
        ':section_id'    => $dto->sectionId,
        ':department_id' => $dto->departmentId,
        ':name'          => trim($dto->name),
        ':description'   => $dto->description !== null ? trim($dto->description) : null,
        ':created_by'    => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
    return $newUnitId;
  }

  /**
   * Applies a partial update to an existing (active) unit.
   *
   * @return bool True if there were fields to update.
   */
  public function updateUnit(string $unitId, UpdateUnitDTO $dto): bool {
    $fields = [];
    $params = [':unit_id' => $unitId];

    if ($dto->name !== null) {
      $fields[] = 'name = :name';
      $params[':name'] = trim($dto->name);
    }
    if ($dto->description !== null) {
      $fields[] = 'description = :description';
      $params[':description'] = trim($dto->description);
    }
    if ($dto->sectionId !== null) {
      $fields[] = 'section_id = :section_id';
      $params[':section_id'] = $dto->sectionId;
    }
    if ($dto->departmentId !== null) {
      $fields[] = 'department_id = :department_id';
      $params[':department_id'] = $dto->departmentId;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE UNITS SET ' . implode(', ', $fields)
         . ' WHERE unit_id = :unit_id AND is_deleted = 0';

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute($params);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
    return true;
  }

  /**
   * Soft-deletes a unit. A unit is a leaf, so there is nothing to cascade
   * down; the plazas (JOB_POSITIONS) pointing to it are de-referenced
   * (unit_id set to NULL) so they re-anchor upward and are not left floating.
   * See docs/soft-delete-design.md §7.
   *
   * @return bool True if the unit was soft-deleted.
   */
  public function deleteUnit(string $unitId, string $deletedBy): bool {
    $this->beginTransaction();
    try {
      // De-reference plazas pointing to this unit.
      $stmt = $this->db->prepare(
        'UPDATE JOB_POSITIONS SET unit_id = NULL WHERE unit_id = :unit_id'
      );
      $stmt->execute([':unit_id' => $unitId]);

      // Soft-delete the unit itself.
      $stmt = $this->db->prepare(
        'UPDATE UNITS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE unit_id = :unit_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':unit_id' => $unitId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Restores a soft-deleted unit. Conflict validation (no active unit with the
   * same name) is done in the service.
   *
   * @return bool True if a deleted unit was restored.
   */
  public function restoreUnit(string $unitId): bool {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE UNITS
            SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE unit_id = :unit_id AND is_deleted = 1'
      );
      $stmt->execute([':unit_id' => $unitId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
