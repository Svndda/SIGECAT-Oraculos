<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\AreaRequestDTO;
use PDO;
use PDOException;

/**
 * AreaRepository
 *
 * Handles all database operations related to the AREAS table.
 * Encapsulates SQL, uses prepared statements, and enforces ACID
 * on write operations.
 *
 * Soft delete: rows are never physically removed. `is_deleted` marks the
 * logical state; reads default to active rows only and accept a status
 * filter ('active' | 'deleted' | 'all').
 */
final class AreaRepository extends Repository {

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

  public function findById(string $areaId, string $status = 'active'): ?array {
    $stmt = $this->db->prepare(
      'SELECT area_id, name, description, created_at, created_by, is_deleted, deleted_at
       FROM AREAS
       WHERE area_id = :area_id' . $this->statusCondition($status) . '
       AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Checks whether an ACTIVE area already uses the given name
   * (case-insensitive), optionally excluding one area id.
   * Deleted areas are ignored so their names can be reused.
   */
  public function existsByName(string $name, ?string $excludeAreaId = null): bool {
    if ($excludeAreaId !== null) {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM AREAS
         WHERE UPPER(name) = UPPER(:name)
         AND area_id <> :area_id
         AND is_deleted = 0'
      );
      $stmt->execute([':name' => $name, ':area_id' => $excludeAreaId]);
    } else {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM AREAS
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
   * @return array<int, array<string, mixed>>
   */
  public function getAreas(int $offset, int $limit, string $filter = '', string $status = 'active'): array {
    $stmt = $this->db->prepare(
      'SELECT area_id, name, description, created_at, created_by, is_deleted, deleted_at
       FROM AREAS
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

  public function countAreas(string $filter = '', string $status = 'active'): int {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total
       FROM AREAS
       WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status)
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  public function createArea(string $createdBy, AreaRequestDTO $dto): void {
    $newAreaId = UlidGenerator::generate();
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO AREAS (area_id, name, description, created_at, created_by)
         VALUES (:area_id, :name, :description, CURRENT_TIMESTAMP, :created_by)'
      );
      $stmt->execute([
        ':area_id'     => $newAreaId,
        ':name'        => trim($dto->name),
        ':description' => $dto->description !== null ? trim($dto->description) : null,
        ':created_by'  => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function updateArea(string $areaId, AreaRequestDTO $dto): void {
    $fields = [];
    $params = [':area_id' => $areaId];

    $fields[] = 'name = :name';
    $params[':name'] = trim($dto->name);

    if ($dto->description !== null) {
      $fields[] = 'description = :description';
      $params[':description'] = trim($dto->description);
    }

    $sql = 'UPDATE AREAS SET ' . implode(', ', $fields)
         . ' WHERE area_id = :area_id AND is_deleted = 0';

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

  public function hasChildEntities(string $areaId): bool {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM DEPARTMENTS WHERE area_id = :area_id AND is_deleted = 0 AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ((int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0) {
      return true;
    }

    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM SECTIONS WHERE area_id = :area_id AND is_deleted = 0 AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /**
   * Soft-deletes an area and cascades to its children, all in one transaction:
   *   - child units (under the area's departments or sections)
   *   - child departments and sections
   *   - the area's plazas (JOB_POSITIONS) — AREA_ID is NOT NULL so they cannot
   *     be de-referenced; they are soft-deleted instead
   *   - the area itself
   */
  public function deleteArea(string $areaId, string $deletedBy): void {
    $this->beginTransaction();
    try {
      // 1. Units belonging to this area's departments or sections.
      $stmt = $this->db->prepare(
        'UPDATE UNITS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE is_deleted = 0
            AND (department_id IN (SELECT department_id FROM DEPARTMENTS WHERE area_id = :area_id_a)
              OR section_id    IN (SELECT section_id    FROM SECTIONS    WHERE area_id = :area_id_b))'
      );
      $stmt->execute([
        ':deleted_by' => $deletedBy,
        ':area_id_a'  => $areaId,
        ':area_id_b'  => $areaId,
      ]);

      // 2. Departments of the area.
      $stmt = $this->db->prepare(
        'UPDATE DEPARTMENTS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE area_id = :area_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':area_id' => $areaId]);

      // 3. Sections of the area.
      $stmt = $this->db->prepare(
        'UPDATE SECTIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE area_id = :area_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':area_id' => $areaId]);

      // 4. Plazas of the area (cascade soft-delete; cannot re-anchor).
      $stmt = $this->db->prepare(
        'UPDATE JOB_POSITIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE area_id = :area_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':area_id' => $areaId]);

      // 5. The area itself.
      $stmt = $this->db->prepare(
        'UPDATE AREAS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE area_id = :area_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':area_id' => $areaId]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Restores a soft-deleted area (only the area itself; children stay deleted
   * and are restored individually). Conflict validation is done in the service.
   */
  public function restoreArea(string $areaId): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE AREAS
            SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE area_id = :area_id AND is_deleted = 1'
      );
      $stmt->execute([':area_id' => $areaId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
