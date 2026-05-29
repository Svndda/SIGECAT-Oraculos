<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateSectionDTO;
use DTO\UpdateSectionDTO;
use PDO;

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
   * * @return array<string, mixed>|null Associative array with UPPERCASE keys or null if not found.
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
  public function update(UpdateSectionDTO $dto): bool
  {
    $fields = [];
    $params = [':v_section_id' => $dto->sectionId];

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
   * Permanently deletes a section record by its unique identifier.
   *
   * @param string $sectionId The ULID identifier.
   * * @return bool True if a row was affected/deleted, false otherwise.
   */
  public function delete(string $sectionId): bool
  {
    $sql = 'DELETE FROM sections WHERE section_id = :v_section_id';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_section_id' => $sectionId]);

    return $stmt->rowCount() > 0;
  }
}