<?php

declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DateTimeInterface;
use PDO;
use PDOException;

/**
 * DeclarationsRepository
 *
 * Repository for declaration-related database operations.
 * Interacts with the DECLARATIONS and DECLARATIONS_STATUS tables, using
 * Oracle stored functions and direct SQL. All methods use PDO with named
 * parameters.
 *
 * @package Repositories
 */
final class DeclarationsRepository extends Repository
{
  /**
   * Constructor.
   *
   * @param PDO $db Active database connection.
   */
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Registers a new declaration in the database.
   *
   * Calls the Oracle function CLIENT.FN_REGISTER_DECLARATION to create the
   * declaration and its initial status. Generates a new ULID for the status ID.
   *
   * @param string $declarationId The ULID for the new declaration.
   * @param string $userId ID of the user creating the declaration.
   * @param string $jobPositionId ID of the job position.
   * @param DateTimeInterface $shiftStartsAt Start of the shift.
   * @param DateTimeInterface $shiftEndsAt End of the shift.
   * @return string The result from the stored function (typically success code).
   * @throws PDOException On database errors.
   */
  public function registerDeclaration(
    string $declarationId,
    string $userId,
    string $jobPositionId,
    DateTimeInterface $shiftStartsAt,
    DateTimeInterface $shiftEndsAt
  ): string {
    $statusId = UlidGenerator::generate();

    $sql = 'BEGIN 
                :v_result := CLIENT.FN_REGISTER_DECLARATION(
                    :v_declaration_id,
                    :v_status_id,
                    :v_user_id,
                    :v_job_position_id,
                    TO_TIMESTAMP(:v_shift_starts_at, \'YYYY-MM-DD HH24:MI:SS\'),
                    TO_TIMESTAMP(:v_shift_ends_at, \'YYYY-MM-DD HH24:MI:SS\'),
                    NULL
                );
            END;';

    $stmt = $this->db->prepare($sql);
    $stmt->bindParam(
      ':v_result', $result,
      PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 50
    );

    $stmt->bindValue(':v_declaration_id', $declarationId);
    $stmt->bindValue(':v_status_id', $statusId);
    $stmt->bindValue(':v_user_id', $userId);
    $stmt->bindValue(':v_job_position_id', $jobPositionId);

    $stmt->bindValue(
      ':v_shift_starts_at', $shiftStartsAt->format('Y-m-d H:i:s')
    );
    $stmt->bindValue(':v_shift_ends_at', $shiftEndsAt->format('Y-m-d H:i:s'));

    $stmt->execute();

    return $result;
  }

  /**
   * Changes the status of a declaration.
   *
   * Calls CLIENT.FN_CHANGE_DECLARATION_STATUS, which creates a new status history entry.
   *
   * @param string $declarationId The declaration to update.
   * @param string $newStatus The new status value.
   * @param string $createdBy The user performing the change.
   * @return string Result from stored function.
   * @throws PDOException On database errors.
   */
  public function changeStatus(
    string $declarationId,
    string $newStatus,
    string $createdBy
  ): string {
    $statusId = UlidGenerator::generate();

    $sql = 'BEGIN 
                :v_result := CLIENT.FN_CHANGE_DECLARATION_STATUS(
                    :v_status_id,
                    :v_declaration_id,
                    :v_new_status,
                    :v_created_by
                );
            END;';

    $stmt = $this->db->prepare($sql);
    $stmt->bindParam(
      ':v_result', $result,
      PDO::PARAM_STR, 50
    );
    $stmt->bindParam(':v_status_id', $statusId);
    $stmt->bindParam(':v_declaration_id', $declarationId);
    $stmt->bindParam(':v_new_status', $newStatus);
    $stmt->bindParam(':v_created_by', $createdBy);
    $stmt->execute();

    return $result;
  }

  /**
   * Retrieves the current status of a declaration.
   *
   * Calls CLIENT.FN_GET_CURRENT_STATUS.
   *
   * @param string $declarationId
   * @return string|null The status value, or null if not found.
   * @throws PDOException
   */
  public function getCurrentStatus(string $declarationId): ?string
  {
    $sql = 'BEGIN 
                :v_result := CLIENT.FN_GET_CURRENT_STATUS(:v_declaration_id);
            END;';

    $stmt = $this->db->prepare($sql);
    $stmt->bindParam(
      ':v_result', $result,
      PDO::PARAM_STR, 50
    );
    $stmt->bindParam(':v_declaration_id', $declarationId);
    $stmt->execute();

    return !empty($result) ? $result : null;
  }

  /**
   * Updates the justification field of a declaration.
   *
   * Direct UPDATE on DECLARATIONS table.
   *
   * @param string $declarationId
   * @param string $justification
   * @return bool True if the update affected at least one row.
   * @throws PDOException
   */
  public function updateJustification(
    string $declarationId, string $justification
  ): bool {
    $sql = 'BEGIN 
                :v_result := CLIENT.FN_UPDATE_JUSTIFICATION(
                    :v_declaration_id,
                    :v_justification
                );
            END;';


    $stmt = $this->db->prepare($sql);

    $result = null;
    $stmt->bindParam(':v_result', $result, PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 10);

    $stmt->bindParam(':v_declaration_id', $declarationId, PDO::PARAM_STR, 50);
    $stmt->bindParam(':v_justification', $justification, PDO::PARAM_STR, 4000);

    $stmt->execute();

    return (bool)$result;
  }

  /**
   * Finds a declaration by its ID, without status.
   *
   * @param string $declarationId
   * @return array<string, string> |null The declaration data or null if not
   * found.
   * @throws PDOException
   */
  public function findById(string $declarationId): ?array
  {
    $sql = '
                SELECT 
                    d.DECLARATION_ID,
                    d.USER_ID,
                    d.JOB_POSITION_ID,
                    d.JUSTIFICATION,
                    d.CREATED_AT,
                    d.SHIFT_STARTS_AT,
                    d.SHIFT_ENDS_AT
                FROM DECLARATIONS d
                WHERE d.DECLARATION_ID = :v_declaration_id
            ';
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_declaration_id' => $declarationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Retrieves the full status history for a declaration.
   *
   * @param string $declarationId
   * @return array<int, array<string, mixed>> List of status entries, ordered by CREATED_AT
   * descending.
   * @throws PDOException
   */
  public function getStatusHistory(string $declarationId): array
  {
    $sql = '
                SELECT 
                    DECLARATION_STATUS_ID,
                    STATUS_VALUE,
                    CREATED_AT,
                    CREATED_BY
                FROM DECLARATIONS_STATUS
                WHERE DECLARATION_ID = :v_declaration_id
                ORDER BY CREATED_AT DESC
            ';
    $stmt = $this->db->prepare($sql);
    $stmt->execute([':v_declaration_id' => $declarationId]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $result;
  }

  /**
   * Finds the most recent incomplete declaration for a user.
   *
   * @param string $userId
   * @return string|null The declaration ID if an incomplete one exists, else null.
   * @throws PDOException
   */
  public function findIncompleteByUser(string $userId): ?string
  {
    $sql = 'BEGIN 
                :v_result := CLIENT.FN_FIND_INCOMPLETE_BY_USER(:v_user_id);
            END;';

    $stmt = $this->db->prepare($sql);
    $stmt->bindParam(
      ':v_result', $result, PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 50
    );
    $stmt->bindValue(':v_user_id', $userId);
    $stmt->execute();

    // The function returns NULL if not found, which becomes an empty string or null in PHP
    return ($result !== null && $result !== '') ? $result : null;
  }

  /**
   * Retrieves a paginated list of declarations with their current status.
   *
   * @param int $limit Number of records per page.
   * @param int $offset Offset for pagination.
   * @param array<string, string> $filters Associative array of filters.
   * @return array<int, array<string, mixed>> List of declarations.
   * @throws PDOException
   */
  public function findAllPaginated(int $limit, int $offset, array $filters = []
  ): array {
    // The latest status per declaration used to be picked with a correlated
    // subquery (WHERE ds.CREATED_AT = (SELECT MAX(...) ... WHERE
    // DECLARATION_ID = d.DECLARATION_ID)), re-evaluated for every joined row.
    // A window function does the same job in a single pass over the
    // (DECLARATION_ID, CREATED_AT DESC) index (idx_declarations_status_decl).
    // Filters that depend on d.* apply inside the window (cheap, index-backed);
    // the status filter can only apply once the latest row is known, so it's
    // applied in the outer WHERE after RN = 1.
    $innerFilters = $this->buildFilterConditions($filters, forInnerQuery: true);
    $outerFilters = $this->buildFilterConditions($filters, forInnerQuery: false);

    $sql = '
                SELECT DECLARATION_ID, USER_ID, JOB_POSITION_ID, JUSTIFICATION,
                       CREATED_AT, SHIFT_STARTS_AT, SHIFT_ENDS_AT, CURRENT_STATUS
                FROM (
                    SELECT
                        d.DECLARATION_ID,
                        d.USER_ID,
                        d.JOB_POSITION_ID,
                        d.JUSTIFICATION,
                        d.CREATED_AT,
                        d.SHIFT_STARTS_AT,
                        d.SHIFT_ENDS_AT,
                        ds.STATUS_VALUE AS CURRENT_STATUS,
                        ROW_NUMBER() OVER (
                            PARTITION BY d.DECLARATION_ID ORDER BY ds.CREATED_AT DESC
                        ) AS RN
                    FROM DECLARATIONS d
                    INNER JOIN DECLARATIONS_STATUS ds
                        ON d.DECLARATION_ID = ds.DECLARATION_ID
                    WHERE 1 = 1' . $innerFilters['where'] . '
                )
                WHERE RN = 1' . $outerFilters['where'] . '
                ORDER BY CREATED_AT DESC
                OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
            ';

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':v_offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':v_limit', $limit, PDO::PARAM_INT);
    foreach ([...$innerFilters['params'], ...$outerFilters['params']] as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  /**
   * Builds WHERE conditions and parameters from filters.
   *
   * @param array<string, string> $filters
   * @param bool $forInnerQuery When true, returns the d.*-only conditions
   *   (user/date/free-text) meant for the windowed inner query; when false,
   *   returns just the status condition, meant for the outer WHERE RN = 1.
   * @return array{where: string, params: array<string, mixed>}
   */
  private function buildFilterConditions(array $filters, bool $forInnerQuery = true): array
  {
    $conditions = [];
    $params = [];

    if ($forInnerQuery) {
      if (!empty($filters['user_id'])) {
        $conditions[] = 'd.USER_ID = :v_user_id';
        $params[':v_user_id'] = $filters['user_id'];
      }
      if (!empty($filters['from_date'])) {
        $conditions[] = 'd.CREATED_AT >= :v_from_date';
        $params[':v_from_date'] = $filters['from_date'];
      }
      if (!empty($filters['to_date'])) {
        $conditions[] = 'd.CREATED_AT <= :v_to_date';
        $params[':v_to_date'] = $filters['to_date'];
      }
      if (!empty($filters['filter'])) {
        $conditions[] = '(
                        UPPER(d.JOB_POSITION_ID) LIKE UPPER(:v_filter) OR
                        UPPER(d.USER_ID) LIKE UPPER(:v_filter)
                    )';
        $params[':v_filter'] = '%' . $filters['filter'] . '%';
      }
    } else {
      if (!empty($filters['status']) && $filters['status'] !== 'all') {
        $conditions[] = 'CURRENT_STATUS = :v_status';
        $params[':v_status'] = $filters['status'];
      }
    }

    $where = '';
    if (!empty($conditions)) {
      $where = ' AND ' . implode(' AND ', $conditions);
    }

    return ['where' => $where, 'params' => $params];
  }

  /**
   * Counts total declarations matching the given filters.
   *
   * @param array{
   *   user_id?: string,
   *   status?: string,
   *   from_date?: string,
   *   to_date?: string,
   *   filter?: string
   * } $filters Same filter structure as findAllPaginated.
   * @return int Total count.
   * @throws PDOException
   */
  public function countAll(array $filters = []): int
  {
    $sql = 'BEGIN 
                :v_result := CLIENT.FN_COUNT_DECLARATIONS(
                    :v_user_id,
                    :v_status,
                    :v_from_date,
                    :v_to_date,
                    :v_filter
                );
            END;';

    $stmt = $this->db->prepare($sql);

    $result = null;
    $stmt->bindParam(':v_result', $result, PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 20);

    $user_id   = $filters['user_id'] ?? null;
    $status    = $this->normalizeStatusFilter($filters['status'] ?? null);
    $from_date = $filters['from_date'] ?? null;
    $to_date   = $filters['to_date'] ?? null;
    $filter    = $filters['filter'] ?? null;

    $stmt->bindParam(':v_user_id', $user_id, PDO::PARAM_STR, 50);
    $stmt->bindParam(':v_status', $status, PDO::PARAM_STR, 50);
    $stmt->bindParam(':v_from_date', $from_date, PDO::PARAM_STR, 50);
    $stmt->bindParam(':v_to_date', $to_date, PDO::PARAM_STR, 50);
    $stmt->bindParam(':v_filter', $filter, PDO::PARAM_STR, 200);

    $stmt->execute();

    return (int) $result;
  }

  /**
   * Helper to convert status filter to NULL when it is 'all' or empty.
   */
  private function normalizeStatusFilter(?string $status): ?string
  {
    if ($status === null || $status === 'all') {
      return null;
    }
    return $status;
  }
}