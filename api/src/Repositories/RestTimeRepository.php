<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateRestTimeDTO;
use DTO\UpdateRestTimeDTO;
use PDO;
use PDOException;

/**
 * Repository handling persistence operations for the REST_TIMES table.
 *
 * This class encapsulates all CRUD operations for rest time entries,
 * ensuring seamless data handling and DTO-driven persistence.
 *
 * Soft delete: rows are never physically removed. `is_deleted` marks the
 * logical state; reads default to active rows only and accept a status
 * filter ('active' | 'deleted' | 'all').
 *
 * @package Repositories
 */
final class RestTimeRepository extends Repository
{
  /**
   * Constructs the RestTimeRepository with an active database connection.
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
   *
   * @param string $status Logical state filter.
   * @return string SQL condition string.
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
   * Normalizes a raw database row into an associative array with the
   * canonical (snake_case) keys exposed by the API.
   *
   * @param array<string, mixed> $row Raw row fetched from the database.
   * @return array<string, mixed>
   */
  private function mapRow(array $row): array
  {
    return [
      'rest_time_id' => $row['rest_time_id'] ?? $row['REST_TIME_ID'],
      'user_id'      => $row['user_id'] ?? $row['USER_ID'],
      'coffee_hours' => isset($row['coffee_hours']) || isset($row['COFFEE_HOURS'])
        ? (($row['coffee_hours'] ?? $row['COFFEE_HOURS']) !== null
          ? (float) ($row['coffee_hours'] ?? $row['COFFEE_HOURS'])
          : null)
        : null,
      'lunch_hours'  => isset($row['lunch_hours']) || isset($row['LUNCH_HOURS'])
        ? (($row['lunch_hours'] ?? $row['LUNCH_HOURS']) !== null
          ? (float) ($row['lunch_hours'] ?? $row['LUNCH_HOURS'])
          : null)
        : null,
      'needed_time'  => isset($row['needed_time']) || isset($row['NEEDED_TIME'])
        ? (($row['needed_time'] ?? $row['NEEDED_TIME']) !== null
          ? (int) ($row['needed_time'] ?? $row['NEEDED_TIME'])
          : null)
        : null,
      'rest_type'    => $row['rest_type'] ?? $row['REST_TYPE'] ?? null,
      'created_at'   => $row['created_at'] ?? $row['CREATED_AT'] ?? null,
      'is_deleted'   => $row['is_deleted'] ?? $row['IS_DELETED'] ?? 0,
      'deleted_at'   => $row['deleted_at'] ?? $row['DELETED_AT'] ?? null,
    ];
  }

  /**
   * Persists a new rest time record into the database.
   *
   * @param CreateRestTimeDTO $dto Validated data container for creation.
   * @return string The generated rest_time_id (ULID) of the new record.
   */
  public function create(CreateRestTimeDTO $dto): string
  {
    $restTimeId = UlidGenerator::generate();

    $sql = '
        INSERT INTO rest_times (
          rest_time_id, user_id, coffee_hours, lunch_hours, needed_time, rest_type
        )
        VALUES (
          :v_rest_time_id, :v_user_id, :v_coffee_hours, :v_lunch_hours, :v_needed_time, :v_rest_type
        )
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([
      ':v_rest_time_id' => $restTimeId,
      ':v_user_id'      => $dto->userId,
      ':v_coffee_hours' => $dto->coffeeHours,
      ':v_lunch_hours'  => $dto->lunchHours,
      ':v_needed_time'  => $dto->neededTime,
      ':v_rest_type'    => $dto->restType,
    ]);

    return $restTimeId;
  }

  /**
   * Retrieves a single rest time record by its unique identifier.
   *
   * @param string $restTimeId The ULID identifier.
   * @param string $status Filter status (active, deleted, all).
   * @return array<string, mixed>|null Associative array or null if not found.
   */
  public function findById(string $restTimeId, string $status = 'active'): ?array
  {
    $sql = '
        SELECT rest_time_id, user_id, coffee_hours, lunch_hours, needed_time,
               rest_type, created_at, is_deleted, deleted_at
        FROM rest_times
        WHERE rest_time_id = :v_rest_time_id' . $this->statusCondition($status) . '
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_rest_time_id' => $restTimeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $this->mapRow($row);
  }

  /**
   * Fetches a paginated list of records from the rest_times table.
   *
   * @param int $limit The maximum number of records to return.
   * @param int $offset The number of records to skip.
   * @param string $filter Optional string to filter by rest type.
   * @param string $status One of active|deleted|all (default active).
   * @return array<int, array<string, mixed>> List of rest time entries.
   */
  public function findAllPaginated(int $limit, int $offset, string $filter = '', string $status = 'active'): array
  {
    $sql = '
        SELECT rest_time_id, user_id, coffee_hours, lunch_hours, needed_time,
               rest_type, created_at, is_deleted, deleted_at
        FROM rest_times
        WHERE UPPER(rest_type) LIKE UPPER(:v_filter)' . $this->statusCondition($status) . '
        ORDER BY created_at DESC
        OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    $stmt->bindValue(':v_offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':v_limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return array_map([$this, 'mapRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  /**
   * Counts the total number of rest time entries matching the filter and status.
   *
   * @param string $filter Optional string to filter by rest type.
   * @param string $status One of active|deleted|all (default active).
   * @return int The total count of rest time records.
   */
  public function countAll(string $filter = '', string $status = 'active'): int
  {
    $sql = '
        SELECT COUNT(*) as total
        FROM rest_times
        WHERE UPPER(rest_type) LIKE UPPER(:v_filter)' . $this->statusCondition($status);

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_filter', '%' . $filter . '%');
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? (int) ($row['total'] ?? $row['TOTAL'] ?? 0) : 0;
  }

  /**
   * Performs a partial or full update on an existing rest time entry.
   *
   * @param string $restTimeId Rest time UID to update.
   * @param UpdateRestTimeDTO $dto Validated data container for updates.
   * @return bool True if the record was updated successfully, false otherwise.
   */
  public function update(string $restTimeId, UpdateRestTimeDTO $dto): bool
  {
    $fields = [];
    $params = [':v_rest_time_id' => $restTimeId];

    if ($dto->coffeeHours !== null) {
      $fields[] = 'coffee_hours = :v_coffee_hours';
      $params[':v_coffee_hours'] = $dto->coffeeHours;
    }

    if ($dto->lunchHours !== null) {
      $fields[] = 'lunch_hours = :v_lunch_hours';
      $params[':v_lunch_hours'] = $dto->lunchHours;
    }

    if ($dto->neededTime !== null) {
      $fields[] = 'needed_time = :v_needed_time';
      $params[':v_needed_time'] = $dto->neededTime;
    }

    if ($dto->restType !== null) {
      $fields[] = 'rest_type = :v_rest_type';
      $params[':v_rest_type'] = $dto->restType;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE rest_times SET ' . implode(', ', $fields)
      . ' WHERE rest_time_id = :v_rest_time_id AND is_deleted = 0';

    return $this->db->prepare($sql)->execute($params);
  }

  /**
   * Soft-deletes a rest time entry.
   *
   * @param string $restTimeId The ULID identifier.
   * @param string $deletedBy ULID of the user performing the deletion.
   * @return bool True if the rest time row was soft-deleted.
   */
  public function delete(string $restTimeId, string $deletedBy): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE rest_times
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :v_deleted_by
          WHERE rest_time_id = :v_rest_time_id AND is_deleted = 0'
      );
      $stmt->execute([':v_deleted_by' => $deletedBy, ':v_rest_time_id' => $restTimeId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Restores a soft-deleted rest time entry.
   *
   * @param string $restTimeId The ULID identifier.
   * @return bool True if a deleted rest time row was restored.
   */
  public function restore(string $restTimeId): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE rest_times
            SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
          WHERE rest_time_id = :v_rest_time_id AND is_deleted = 1'
      );
      $stmt->execute([':v_rest_time_id' => $restTimeId]);
      $affected = $stmt->rowCount() > 0;

      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
