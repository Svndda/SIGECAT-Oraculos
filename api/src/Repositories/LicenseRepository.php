<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateLicenseDTO;
use DTO\UpdateLicenseDTO;
use PDO;
use PDOException;

/**
 * LicenseRepository
 *
 * Data access for LICENSE_TIMES: the licenses/permits an employee declares.
 * Each license is a line of a declaration: it belongs to a user and a
 * declaration and spans a [starts_at, ends_at] range for a given license type.
 * Rows are deleted physically (the table has no soft-delete columns).
 *
 * @package Repositories
 */
final class LicenseRepository extends Repository
{
  /** SQL expression turning a canonical 'Y-m-d H:i:s' bind into a TIMESTAMP. */
  private const TS = "TO_TIMESTAMP(:%s, 'YYYY-MM-DD HH24:MI:SS')";

  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Normalizes a raw database row into an associative array with the canonical
   * (snake_case) keys exposed by the API. Includes the license type name when
   * the query joins LICENSE_TYPES.
   *
   * @param array<string, mixed> $row Raw row fetched from the database.
   * @return array<string, mixed>
   */
  private function mapRow(array $row): array
  {
    return [
      'license_time_id'   => $row['license_time_id'] ?? $row['LICENSE_TIME_ID'],
      'user_id'           => $row['user_id'] ?? $row['USER_ID'],
      'declaration_id'    => $row['declaration_id'] ?? $row['DECLARATION_ID'],
      'license_type_id'   => $row['license_type_id'] ?? $row['LICENSE_TYPE_ID'],
      'license_type_name' => $row['license_type_name'] ?? $row['LICENSE_TYPE_NAME'] ?? null,
      'starts_at'         => $row['starts_at'] ?? $row['STARTS_AT'],
      'ends_at'           => $row['ends_at'] ?? $row['ENDS_AT'],
    ];
  }

  /**
   * Persists a new license record into the database.
   *
   * @param string $userId The owner (taken from the authenticated request).
   * @param CreateLicenseDTO $dto Validated data container for creation.
   * @return string The generated license_time_id (ULID) of the new record.
   */
  public function create(string $userId, CreateLicenseDTO $dto): string
  {
    $licenseTimeId = UlidGenerator::generate();

    $sql = sprintf(
      'INSERT INTO license_times (
          license_time_id, user_id, declaration_id, license_type_id, starts_at, ends_at
        ) VALUES (
          :v_license_time_id, :v_user_id, :v_declaration_id, :v_license_type_id, %s, %s
        )',
      sprintf(self::TS, 'v_starts_at'),
      sprintf(self::TS, 'v_ends_at')
    );

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute([
        ':v_license_time_id' => $licenseTimeId,
        ':v_user_id'         => $userId,
        ':v_declaration_id'  => $dto->declarationId,
        ':v_license_type_id' => $dto->licenseTypeId,
        ':v_starts_at'       => $dto->startsAt,
        ':v_ends_at'         => $dto->endsAt,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }

    return $licenseTimeId;
  }

  /**
   * Retrieves a single license record by its unique identifier.
   *
   * @param string $licenseTimeId The ULID identifier.
   * @return array<string, mixed>|null Associative array or null if not found.
   */
  public function findById(string $licenseTimeId): ?array
  {
    $sql = "
        SELECT lt.license_time_id, lt.user_id, lt.declaration_id, lt.license_type_id,
               t.name AS license_type_name,
               TO_CHAR(lt.starts_at, 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
               TO_CHAR(lt.ends_at,   'YYYY-MM-DD HH24:MI:SS') AS ends_at
        FROM license_times lt
        LEFT JOIN license_types t ON t.license_type_id = lt.license_type_id
        WHERE lt.license_time_id = :v_license_time_id
          AND ROWNUM = 1
    ";

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_license_time_id' => $licenseTimeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row ? $this->mapRow($row) : null;
  }

  /**
   * Fetches a paginated list of license entries, optionally scoped by
   * declaration and/or owner, filtered by license type name.
   *
   * @param int $limit The maximum number of records to return.
   * @param int $offset The number of records to skip.
   * @param string $filter Optional string to filter by license type name.
   * @param string|null $declarationId Optional declaration to scope the list.
   * @param string|null $userId Optional owner to scope the list (self-scoping).
   * @return array<int, array<string, mixed>> List of license entries.
   */
  public function findAllPaginated(int $limit, int $offset, string $filter = '', ?string $declarationId = null, ?string $userId = null): array
  {
    $declCondition = $declarationId !== null ? ' AND lt.declaration_id = :v_declaration_id' : '';
    $userCondition = $userId !== null ? ' AND lt.user_id = :v_user_id' : '';

    $sql = "
        SELECT lt.license_time_id, lt.user_id, lt.declaration_id, lt.license_type_id,
               t.name AS license_type_name,
               TO_CHAR(lt.starts_at, 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
               TO_CHAR(lt.ends_at,   'YYYY-MM-DD HH24:MI:SS') AS ends_at
        FROM license_times lt
        LEFT JOIN license_types t ON t.license_type_id = lt.license_type_id
        WHERE UPPER(t.name) LIKE UPPER(:v_filter)" . $declCondition . $userCondition . "
        ORDER BY lt.starts_at DESC
        OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
    ";

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    if ($declarationId !== null) {
      $stmt->bindValue(':v_declaration_id', $declarationId);
    }
    if ($userId !== null) {
      $stmt->bindValue(':v_user_id', $userId);
    }
    $stmt->bindValue(':v_offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':v_limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return array_map([$this, 'mapRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  /**
   * Counts the total number of license entries matching the filters.
   *
   * @param string $filter Optional string to filter by license type name.
   * @param string|null $declarationId Optional declaration to scope the count.
   * @param string|null $userId Optional owner to scope the count (self-scoping).
   * @return int The total count of license records.
   */
  public function countAll(string $filter = '', ?string $declarationId = null, ?string $userId = null): int
  {
    $declCondition = $declarationId !== null ? ' AND lt.declaration_id = :v_declaration_id' : '';
    $userCondition = $userId !== null ? ' AND lt.user_id = :v_user_id' : '';

    $sql = '
        SELECT COUNT(*) as total
        FROM license_times lt
        LEFT JOIN license_types t ON t.license_type_id = lt.license_type_id
        WHERE UPPER(t.name) LIKE UPPER(:v_filter)' . $declCondition . $userCondition;

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    if ($declarationId !== null) {
      $stmt->bindValue(':v_declaration_id', $declarationId);
    }
    if ($userId !== null) {
      $stmt->bindValue(':v_user_id', $userId);
    }
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? (int) ($row['total'] ?? $row['TOTAL'] ?? 0) : 0;
  }

  /**
   * Performs a partial update on an existing license entry.
   *
   * @param string $licenseTimeId License UID to update.
   * @param UpdateLicenseDTO $dto Validated data container for updates.
   * @return bool True if the record was updated successfully, false otherwise.
   */
  public function update(string $licenseTimeId, UpdateLicenseDTO $dto): bool
  {
    $fields = [];
    $params = [':v_license_time_id' => $licenseTimeId];

    if ($dto->licenseTypeId !== null) {
      $fields[] = 'license_type_id = :v_license_type_id';
      $params[':v_license_type_id'] = $dto->licenseTypeId;
    }

    if ($dto->startsAtProvided) {
      $fields[] = 'starts_at = ' . sprintf(self::TS, 'v_starts_at');
      $params[':v_starts_at'] = $dto->startsAt;
    }

    if ($dto->endsAtProvided) {
      $fields[] = 'ends_at = ' . sprintf(self::TS, 'v_ends_at');
      $params[':v_ends_at'] = $dto->endsAt;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE license_times SET ' . implode(', ', $fields)
      . ' WHERE license_time_id = :v_license_time_id';

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $ok = $stmt->execute($params);
      $this->commit();
      return $ok;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Physically deletes a license entry.
   *
   * @param string $licenseTimeId The ULID identifier.
   * @return bool True if a row was deleted.
   */
  public function delete(string $licenseTimeId): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'DELETE FROM license_times WHERE license_time_id = :v_license_time_id'
      );
      $stmt->execute([':v_license_time_id' => $licenseTimeId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** Whether an active license type with the given id exists. */
  public function licenseTypeExists(string $licenseTypeId): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM license_types
        WHERE license_type_id = :id AND is_deleted = 0'
    );
    $stmt->execute([':id' => $licenseTypeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }
}
