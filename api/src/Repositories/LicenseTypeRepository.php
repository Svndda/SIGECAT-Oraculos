<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateLicenseTypeDTO;
use DTO\UpdateLicenseTypeDTO;
use PDO;
use PDOException;

/**
 * LicenseTypeRepository
 *
 * Data access for LICENSE_TYPES: the catalogue of authorized permits/licenses
 * an employee may declare.
 *
 * Soft delete: rows are never physically removed; `is_deleted` marks state and
 * reads accept a status filter ('active' | 'deleted' | 'all').
 *
 * @package Repositories
 */
final class LicenseTypeRepository extends Repository
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

  /** Creates a license type. */
  public function createLicenseType(string $createdBy, CreateLicenseTypeDTO $dto): void
  {
    $newId = UlidGenerator::generate();

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO LICENSE_TYPES
           (license_type_id, name, created_at, created_by)
         VALUES
           (:id, :name, CURRENT_TIMESTAMP, :created_by)'
      );
      $stmt->execute([
        ':id'         => $newId,
        ':name'       => trim($dto->name),
        ':created_by' => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** Applies a partial update to a license type (only the name is mutable). */
  public function updateLicenseType(string $licenseTypeId, UpdateLicenseTypeDTO $dto): void
  {
    if ($dto->name === null) {
      return;
    }

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE LICENSE_TYPES SET name = :name
          WHERE license_type_id = :id AND is_deleted = 0'
      );
      $stmt->execute([':name' => trim($dto->name), ':id' => $licenseTypeId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** @return array<string, mixed>|null */
  public function findById(string $licenseTypeId, string $status = 'active'): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT license_type_id, name, created_at, created_by, is_deleted, deleted_at
         FROM LICENSE_TYPES
        WHERE license_type_id = :id' . $this->statusCondition($status) . '
          AND ROWNUM = 1'
    );
    $stmt->execute([':id' => $licenseTypeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /** Whether an active license type with the given name already exists (case-insensitive). */
  public function existsByName(string $name, ?string $excludeId = null): bool
  {
    $sql = 'SELECT COUNT(*) AS cnt FROM LICENSE_TYPES
            WHERE UPPER(name) = UPPER(:name) AND is_deleted = 0';
    $params = [':name' => $name];
    if ($excludeId !== null) {
      $sql .= ' AND license_type_id <> :id';
      $params[':id'] = $excludeId;
    }
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** Number of license times (declared licenses) referencing this type. */
  public function countLicenseTimesUsing(string $licenseTypeId): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM LICENSE_TIMES WHERE license_type_id = :id'
    );
    $stmt->execute([':id' => $licenseTypeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0);
  }

  /** Soft-deletes a license type. */
  public function deleteLicenseType(string $licenseTypeId, string $deletedBy): void
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE LICENSE_TYPES
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by
          WHERE license_type_id = :id AND is_deleted = 0'
      );
      $stmt->execute([':deleted_by' => $deletedBy, ':id' => $licenseTypeId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** @return array<int, array<string, mixed>> */
  public function getLicenseTypes(int $offset, int $limit, string $filter = '', string $status = 'active'): array
  {
    $stmt = $this->db->prepare(
      'SELECT license_type_id, name, created_at, created_by, is_deleted, deleted_at
         FROM LICENSE_TYPES
        WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status) . '
        ORDER BY name ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countLicenseTypes(string $filter = '', string $status = 'active'): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM LICENSE_TYPES
        WHERE UPPER(name) LIKE UPPER(:filter)' . $this->statusCondition($status)
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }
}
