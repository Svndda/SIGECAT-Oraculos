<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use PDO;
use PDOException;

/**
 * JobFunctionRepository
 *
 * Data access for JOB_FUNCTIONS: the functions declared on a DECLARATION. Each
 * row links a declaration, its job position and owner to exactly one official
 * or custom function, over a [starts_at, ends_at] range. The table has no
 * soft-delete, so deletion is physical.
 *
 * @package Repositories
 */
final class JobFunctionRepository extends Repository
{
  /** SQL expression turning a canonical 'Y-m-d H:i:s' bind into a TIMESTAMP. */
  private const TS = "TO_TIMESTAMP(:%s, 'YYYY-MM-DD HH24:MI:SS')";

  /** Columns that must be bound through TO_TIMESTAMP on write. */
  private const TIMESTAMP_COLUMNS = ['starts_at', 'ends_at'];

  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  private function selectColumns(): string
  {
    return "job_function_id, user_id, job_position_id, declaration_id,
            official_function_id, custom_function_id, overtime, justification, frequency,
            TO_CHAR(starts_at, 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
            TO_CHAR(ends_at,   'YYYY-MM-DD HH24:MI:SS') AS ends_at";
  }

  /**
   * Inserts a new declaration function. Returns the generated id.
   *
   * @param array<string, mixed> $values Resolved column => value pairs.
   */
  public function create(array $values): string
  {
    $newId = UlidGenerator::generate();
    $values['job_function_id'] = $newId;

    $columns = array_keys($values);
    $placeholders = array_map(
      static fn(string $c): string => in_array($c, self::TIMESTAMP_COLUMNS, true)
        ? sprintf(self::TS, 'v_' . $c)
        : ':v_' . $c,
      $columns
    );

    $sql = 'INSERT INTO JOB_FUNCTIONS (' . implode(', ', $columns) . ')
            VALUES (' . implode(', ', $placeholders) . ')';

    $params = [];
    foreach ($values as $col => $val) {
      $params[':v_' . $col] = $val;
    }

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute($params);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }

    return $newId;
  }

  /**
   * Applies a partial update.
   *
   * @param array<string, mixed> $values Resolved column => value pairs.
   */
  public function update(string $jobFunctionId, array $values): bool
  {
    if (empty($values)) {
      return false;
    }

    $assignments = [];
    $params = [':v_job_function_id' => $jobFunctionId];
    foreach ($values as $col => $val) {
      $assignments[] = in_array($col, self::TIMESTAMP_COLUMNS, true)
        ? "$col = " . sprintf(self::TS, 'v_' . $col)
        : "$col = :v_$col";
      $params[':v_' . $col] = $val;
    }

    $sql = 'UPDATE JOB_FUNCTIONS SET ' . implode(', ', $assignments)
         . ' WHERE job_function_id = :v_job_function_id';

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

  /** Physically deletes a declaration function. */
  public function delete(string $jobFunctionId): bool
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare('DELETE FROM JOB_FUNCTIONS WHERE job_function_id = :id');
      $stmt->execute([':id' => $jobFunctionId]);
      $affected = $stmt->rowCount() > 0;
      $this->commit();
      return $affected;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /** @return array<string, mixed>|null */
  public function findById(string $jobFunctionId): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT ' . $this->selectColumns() . '
         FROM JOB_FUNCTIONS
        WHERE job_function_id = :id AND ROWNUM = 1'
    );
    $stmt->execute([':id' => $jobFunctionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /** @return array<int, array<string, mixed>> */
  public function getByDeclaration(string $declarationId, int $offset, int $limit): array
  {
    $stmt = $this->db->prepare(
      'SELECT ' . $this->selectColumns() . '
         FROM JOB_FUNCTIONS
        WHERE declaration_id = :declaration_id
        ORDER BY starts_at ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':declaration_id', $declarationId);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countByDeclaration(string $declarationId): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM JOB_FUNCTIONS WHERE declaration_id = :declaration_id'
    );
    $stmt->execute([':declaration_id' => $declarationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  /** @return array<int, array<string, mixed>> */
  public function getByUser(string $userId, int $offset, int $limit): array
  {
    $stmt = $this->db->prepare(
      'SELECT ' . $this->selectColumns() . '
         FROM JOB_FUNCTIONS
        WHERE user_id = :user_id
        ORDER BY starts_at DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':user_id', $userId);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countByUser(string $userId): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM JOB_FUNCTIONS WHERE user_id = :user_id'
    );
    $stmt->execute([':user_id' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }
}
