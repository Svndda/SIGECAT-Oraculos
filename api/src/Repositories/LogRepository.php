<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use PDO;
use PDOException;

/**
 * LogRepository
 *
 * Data access for SYSTEM_LOGS, the append-only system-wide event log.
 *
 * Writes are intentionally decoupled from the caller's transaction: a log row
 * must persist even when the surrounding business transaction is rolled back
 * (e.g. logging the very failure that caused the rollback). Inserts therefore
 * run on their own short transaction, and only when the connection is not
 * already mid-transaction — otherwise the insert simply joins the active one
 * rather than risking a commit of half-finished business work.
 *
 * @package Repositories
 */
final class LogRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Persists a single log entry.
   *
   * @param array<string, mixed> $entry Normalized log fields.
   * @return void
   * @throws PDOException If the insert fails (callers in the Logger swallow it).
   */
  public function insert(array $entry): void
  {
    $ownsTransaction = !$this->db->inTransaction();

    if ($ownsTransaction) {
      $this->beginTransaction();
    }

    try {
      $stmt = $this->db->prepare(
        'INSERT INTO SYSTEM_LOGS
           (log_id, log_level, category, action, message, context,
            user_id, ip_address, http_method, http_path, status_code, created_at)
         VALUES
           (:id, :log_level, :category, :action, :message, :context,
            :user_id, :ip, :method, :path, :status, CURRENT_TIMESTAMP)'
      );

      $stmt->execute([
        ':id'        => UlidGenerator::generate(),
        ':log_level' => $entry['level'],
        ':category' => $entry['category'],
        ':action'   => $entry['action'],
        ':message'  => $entry['message'],
        ':context'  => $entry['context'],
        ':user_id'  => $entry['user_id'],
        ':ip'       => $entry['ip_address'],
        ':method'   => $entry['http_method'],
        ':path'     => $entry['http_path'],
        ':status'   => $entry['status_code'],
      ]);

      if ($ownsTransaction) {
        $this->commit();
      }
    } catch (PDOException $e) {
      if ($ownsTransaction) {
        $this->rollBack();
      }
      throw $e;
    }
  }

  /**
   * Returns a paginated, filtered slice of the log together with the total
   * count for the same filter set.
   *
   * @param array<string, mixed> $filters level|category|user_id|action|search|date_from|date_to
   * @param int $page  1-based page number.
   * @param int $limit Page size.
   * @return array{data: array<int, array<string, mixed>>, total: int}
   */
  public function query(array $filters, int $page, int $limit): array
  {
    [$where, $params] = $this->buildWhere($filters);

    $countStmt = $this->db->prepare(
      "SELECT COUNT(*) AS total FROM SYSTEM_LOGS {$where}"
    );
    $countStmt->execute($params);
    $total = (int) ($countStmt->fetch()['total'] ?? 0);

    $offset = ($page - 1) * $limit;

    // Deliberately omit the CONTEXT CLOB from the list: pdo_oci fetches each LOB
    // in its own round trip to the (remote) database, which turns a page of rows
    // into dozens of round trips. The list does not render context anyway — it
    // is loaded per row on demand via findById() when a detail view is opened.
    $stmt = $this->db->prepare(
      "SELECT log_id, log_level, category, action, message,
              user_id, ip_address, http_method, http_path, status_code, created_at
         FROM SYSTEM_LOGS
         {$where}
         ORDER BY created_at DESC
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"
    );

    foreach ($params as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return [
      'data'  => $stmt->fetchAll(),
      'total' => $total,
    ];
  }

  /**
   * Loads a single log entry including its CONTEXT CLOB. Used for the detail
   * view, where the per-row LOB round trip is paid once rather than for a whole
   * page. Returns null when the id does not exist.
   *
   * @return array<string, mixed>|null
   */
  public function findById(string $id): ?array
  {
    $stmt = $this->db->prepare(
      "SELECT log_id, log_level, category, action, message, context,
              user_id, ip_address, http_method, http_path, status_code, created_at
         FROM SYSTEM_LOGS
        WHERE log_id = :id"
    );
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    return $row === false ? null : $row;
  }

  /**
   * Distinct values present in the log for the facetable columns, so the
   * viewer can offer real filter options instead of a hard-coded list.
   *
   * @return array{levels: array<int, string>, categories: array<int, string>}
   */
  public function facets(): array
  {
    $levelsStmt = $this->db->prepare('SELECT DISTINCT log_level FROM SYSTEM_LOGS ORDER BY log_level');
    $levelsStmt->execute();

    $categoriesStmt = $this->db->prepare('SELECT DISTINCT category FROM SYSTEM_LOGS ORDER BY category');
    $categoriesStmt->execute();

    return [
      'levels'     => array_map('strval', $levelsStmt->fetchAll(PDO::FETCH_COLUMN)),
      'categories' => array_map('strval', $categoriesStmt->fetchAll(PDO::FETCH_COLUMN)),
    ];
  }

  /**
   * Builds the WHERE clause and bound parameters shared by query() and the
   * count statement.
   *
   * @param array<string, mixed> $filters
   * @return array{0: string, 1: array<string, mixed>}
   */
  private function buildWhere(array $filters): array
  {
    $conditions = [];
    $params = [];

    // The admin "Bitácora" asks for the business slice only: exclude the
    // technical/server events (HTTP request tracing, rate limiting, unhandled
    // exceptions) that share this table. This is a read-side filter — the rows
    // are still written; they are simply not surfaced in the business view.
    if (($filters['scope'] ?? '') === 'business') {
      $conditions[] = "action IS NOT NULL AND action NOT IN
        ('http.request', 'rate_limit.error', 'rate_limit.exceeded', 'unhandled.exception')";
    }

    if (!empty($filters['level'])) {
      $conditions[] = 'log_level = :log_level';
      $params[':log_level'] = $filters['level'];
    }
    if (!empty($filters['category'])) {
      $conditions[] = 'category = :category';
      $params[':category'] = $filters['category'];
    }
    if (!empty($filters['user_id'])) {
      $conditions[] = 'user_id = :user_id';
      $params[':user_id'] = $filters['user_id'];
    }
    if (!empty($filters['action'])) {
      $conditions[] = 'action = :action';
      $params[':action'] = $filters['action'];
    }
    if (!empty($filters['search'])) {
      $conditions[] = 'LOWER(message) LIKE :search';
      $params[':search'] = '%' . strtolower((string) $filters['search']) . '%';
    }
    if (!empty($filters['date_from'])) {
      $conditions[] = 'created_at >= TO_TIMESTAMP(:date_from, \'YYYY-MM-DD HH24:MI:SS\')';
      $params[':date_from'] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
      $conditions[] = 'created_at <= TO_TIMESTAMP(:date_to, \'YYYY-MM-DD HH24:MI:SS\')';
      $params[':date_to'] = $filters['date_to'];
    }

    $where = $conditions === [] ? '' : 'WHERE ' . implode(' AND ', $conditions);

    return [$where, $params];
  }
}
