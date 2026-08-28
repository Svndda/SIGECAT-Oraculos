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
 * Each rest time is a line of a declaration: it belongs to a user and a
 * declaration and has a duration in minutes for a given rest type. Rows are
 * deleted physically (the table has no soft-delete columns).
 *
 * @package Repositories
 */
final class RestTimeRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Persists a new rest time record into the database.
   *
   * @param string $userId The owner (taken from the authenticated request).
   * @param CreateRestTimeDTO $dto Validated data container for creation.
   * @return string The generated rest_time_id (ULID) of the new record.
   */
  public function create(string $userId, CreateRestTimeDTO $dto): string
  {
    $restTimeId = UlidGenerator::generate();

    $sql = 'INSERT INTO rest_times (
          rest_time_id, user_id, declaration_id, rest_type, duration_minutes
        ) VALUES (
          :v_rest_time_id, :v_user_id, :v_declaration_id, :v_rest_type, :v_duration_minutes
        )';

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute([
        ':v_rest_time_id'     => $restTimeId,
        ':v_user_id'          => $userId,
        ':v_declaration_id'   => $dto->declarationId,
        ':v_rest_type'        => $dto->restType,
        ':v_duration_minutes' => $dto->durationMinutes,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }

    return $restTimeId;
  }

  /**
   * Retrieves a single rest time record by its unique identifier.
   *
   * @param string $restTimeId The ULID identifier.
   * @return array<string, mixed>|null Associative array or null if not found.
   */
  public function findById(string $restTimeId): ?array
  {
    $sql = '
        SELECT rest_time_id, user_id, declaration_id, rest_type, duration_minutes
        FROM rest_times
        WHERE rest_time_id = :v_rest_time_id
          AND ROWNUM = 1
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_rest_time_id' => $restTimeId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return null;
    }

    return $row;
  }

  /**
   * Fetches a paginated list of rest time entries, optionally filtered by rest
   * type and/or declaration.
   *
   * @param int $limit The maximum number of records to return.
   * @param int $offset The number of records to skip.
   * @param string $filter Optional string to filter by rest type.
   * @param string|null $declarationId Optional declaration to scope the list.
   * @param string|null $userId Optional owner to scope the list (self-scoping).
   * @return array<int, array<string, mixed>> List of rest time entries.
   */
  public function findAllPaginated(int $limit, int $offset, string $filter = '', ?string $declarationId = null, ?string $userId = null): array
  {
    $declCondition = $declarationId !== null ? ' AND declaration_id = :v_declaration_id' : '';
    $userCondition = $userId !== null ? ' AND user_id = :v_user_id' : '';

    $sql = '
        SELECT rest_time_id, user_id, declaration_id, rest_type, duration_minutes
        FROM rest_times
        WHERE UPPER(rest_type) LIKE UPPER(:v_filter)' . $declCondition . $userCondition . '
        ORDER BY rest_time_id DESC
        OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
    ';

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

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Counts the total number of rest time entries matching the filters.
   *
   * @param string $filter Optional string to filter by rest type.
   * @param string|null $declarationId Optional declaration to scope the count.
   * @param string|null $userId Optional owner to scope the count (self-scoping).
   * @return int The total count of rest time records.
   */
  public function countAll(string $filter = '', ?string $declarationId = null, ?string $userId = null): int
  {
    $declCondition = $declarationId !== null ? ' AND declaration_id = :v_declaration_id' : '';
    $userCondition = $userId !== null ? ' AND user_id = :v_user_id' : '';

    $sql = '
        SELECT COUNT(*) as total
        FROM rest_times
        WHERE UPPER(rest_type) LIKE UPPER(:v_filter)' . $declCondition . $userCondition;

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
   * Performs a partial update on an existing rest time entry.
   *
   * @param string $restTimeId Rest time UID to update.
   * @param UpdateRestTimeDTO $dto Validated data container for updates.
   * @return bool True if the record was updated successfully, false otherwise.
   */
  public function update(string $restTimeId, UpdateRestTimeDTO $dto): bool
  {
    $fields = [];
    $params = [':v_rest_time_id' => $restTimeId];

    if ($dto->restType !== null) {
      $fields[] = 'rest_type = :v_rest_type';
      $params[':v_rest_type'] = $dto->restType;
    }

    if ($dto->durationMinutes !== null) {
      $fields[] = 'duration_minutes = :v_duration_minutes';
      $params[':v_duration_minutes'] = $dto->durationMinutes;
    }

    if (empty($fields)) {
      return false;
    }

    $sql = 'UPDATE rest_times SET ' . implode(', ', $fields)
      . ' WHERE rest_time_id = :v_rest_time_id';

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
   * Physically deletes a rest time entry.
   *
   * @param string $restTimeId The ULID identifier.
   * @return bool True if a row was deleted.
   */
  public function delete(string $restTimeId): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'DELETE FROM rest_times WHERE rest_time_id = :v_rest_time_id'
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