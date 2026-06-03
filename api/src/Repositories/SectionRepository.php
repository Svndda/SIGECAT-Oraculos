<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateSectionDTO;
use DTO\UpdateSectionDTO;
use PDO;
use PDOException;

/**
 * Repository handling persistence operations for the SECTIONS table.
 *
 * This class encapsulates all CRUD operations for sections, ensuring
 * seamless data handling and DTO-driven validation.
 *
 * @package Repositories
 */
final class SectionRepository extends Repository
{
  /**
   * Constructs the SectionRepository with an active database connection.
   *
   * @param PDO $db The active PDO database connection.
   */
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Persists a new section record into the database.
   *
   * @param CreateSectionDTO $dto Validated data container for creation.
   * @param string $createdBy The ULID (CHAR(26)) of the user performing the action.
   * * @return string The generated section_id (ULID) of the new record.
   */
  public function create(CreateSectionDTO $dto, string $createdBy): string
  {
    $sectionId = UlidGenerator::generate();

    $sql = '
        INSERT INTO sections (
          section_id, area_id, name, description, created_by
        )
        VALUES (
          :v_section_id, :v_area_id, :v_name, :v_description, :v_created_by
        )
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_section_id' => $sectionId,
      ':v_area_id' => $dto->areaId,
      ':v_name' => $dto->name,
      ':v_description' => $dto->description,
      ':v_created_by' => $createdBy,
    ]);

    return $sectionId;
  }

  /**
   * Retrieves a single section record by its unique identifier.
   *
   * @param string $sectionId The ULID identifier.
   * @return array<string, mixed>|null Associative array with UPPERCASE keys or null if not found.
   */
  public function findById(string $sectionId): ?array
  {
    $sql = '
        SELECT section_id, area_id, name, description, created_at, created_by
        FROM sections
        WHERE section_id = :v_section_id
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_section_id' => $sectionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return [
      'section_id' => $row['section_id'],
      'area_id' => $row['area_id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'created_at' => $row['created_at'],
      'created_by' => $row['created_by'],
    ];
  }

  /**
   * Fetches all records from the sections table.
   *
   * @return array<int, array<string, mixed>> List of sections with UPPERCASE keys.
   */
  public function findAll(): array
  {
    $sql = '
        SELECT section_id, area_id, name, description, created_at, created_by 
        FROM sections
        ORDER BY name ASC
    ';

    $stmt = $this->db->query($sql);
    if ($stmt === false) {
      return [];
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Performs a partial or full update on an existing section.
   *
   * Dynamically constructs the query depending on the fields present (non-null) 
   * inside the UpdateSectionDTO wrapper.
   *
   * @param UpdateSectionDTO $dto Validated data container for updates.
   * * @return bool True if the record was updated successfully, false otherwise.
   */
  public function update(string $sectionId, UpdateSectionDTO $dto): bool
  {
    $fields = [];
    $params = [':v_section_id' => $sectionId];

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

    $sql = 'UPDATE sections SET ' . implode(', ', $fields) . ' WHERE section_id = :v_section_id';

    $stmt = $this->db->prepare($sql);
    return $stmt->execute($params);
  }

  /**
   * Soft-deletes an sections and cascades to its children, all in one transaction:
   *   - child units
   *   - the section's plazas (JOB_POSITIONS) — SECTION_ID is NOT NULL so they cannot
   *     be de-referenced; they are soft-deleted instead
   *   - the section itself
   */
  public function delete(string $sectionId, string $deletedBy): void {
      $this->beginTransaction();
    try {
      // 1. Units belonging to this section.
      $stmt = $this->db->prepare(
        'UPDATE UNITS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE section_id = :section_id
            AND is_deleted = 0'
      );
      $stmt->execute([
        ':deleted_by' => $deletedBy,
        ':section_id'  => $sectionId,
      ]);

      // 2. Plazas of the sections (cascade soft-delete; cannot re-anchor).
      $stmt = $this->db->prepare(
        'UPDATE JOB_POSITIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE (
              section_id = :section_id
              OR unit_id IN (
                  SELECT unit_id
                  FROM UNITS
                  WHERE section_id = :section_id
                    AND is_deleted = 0
              )
          )
          AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':section_id' => $sectionId]);

      // 3. The section itself.
      $stmt = $this->db->prepare(
        'UPDATE SECTIONS
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE section_id = :section_id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':section_id' => $sectionId]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Checks whether an ACTIVE section already uses the given name
   * (case-insensitive), optionally excluding one section id.
   * Deleted section are ignored so their names can be reused.
   */
  public function existsByName(string $name, ?string $excludeSectionId = null): bool {
    if ($excludeSectionId !== null) {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM SECTIONS
         WHERE UPPER(name) = UPPER(:name)
         AND section_id <> :section_id
         AND is_deleted = 0'
      );
      $stmt->execute([':name' => $name, ':section_id' => $excludeSectionId]);
    } else {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM SECTIONS
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
   * Restores a soft-deleted section (only the section itself; children stay deleted
   * and are restored individually). Conflict validation is done in the service.
   */
  public function restoreSection(string $sectionId): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE SECTIONS
            SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE section_id = :section_id AND is_deleted = 1'
      );
      $stmt->execute([':section_id' => $sectionId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function countSections(string $filter = '', string $status = 'active'): int {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total
       FROM AREAS
       WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status)
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
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
   * @return array<int, array<string, mixed>>
   */
  public function getSections(int $offset, int $limit, string $filter = '', string $status = 'active'): array {
    $stmt = $this->db->prepare(
      'SELECT section_id, area_id, name, description, created_at, created_by, is_deleted, deleted_at
       FROM SECTIONS
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
}