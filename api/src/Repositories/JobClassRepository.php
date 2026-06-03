<?php
declare(strict_types=1);

namespace Repositories;

use PDO;

/**
 * JobClassRepository
 *
 * Read access for JOB_CLASSES (occupational classes): listing for selection
 * and existence checks when assigning one to a user.
 *
 * @package Repositories
 */
final class JobClassRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  public function existsById(string $jobClassId): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM JOB_CLASSES WHERE job_class_id = :id'
    );
    $stmt->execute([':id' => $jobClassId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** @return array<int, array<string, mixed>> */
  public function getJobClasses(int $offset, int $limit, string $filter = ''): array
  {
    $stmt = $this->db->prepare(
      'SELECT job_class_id AS id, name, description, created_at, created_by
         FROM JOB_CLASSES
        WHERE UPPER(name) LIKE UPPER(:filter)
        ORDER BY name
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countJobClasses(string $filter = ''): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM JOB_CLASSES WHERE UPPER(name) LIKE UPPER(:filter)'
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }
}
