<?php
declare(strict_types=1);

namespace Repositories;

use PDO;

/**
 * DeclarationRepository
 *
 * Read access to DECLARATIONS shared by the features that hang off a
 * declaration (rest times, job functions): it exposes the declaration's owner
 * and shift window, plus its current status through the FN_GET_CURRENT_STATUS
 * database function.
 *
 * @package Repositories
 */
final class DeclarationRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /**
   * Returns the declaration's owner, job position and shift window, or null
   * when it does not exist.
   *
   * @return array<string, mixed>|null
   */
  public function findById(string $declarationId): ?array
  {
    $stmt = $this->db->prepare(
      "SELECT declaration_id, user_id, job_position_id,
              TO_CHAR(shift_starts_at, 'YYYY-MM-DD HH24:MI:SS') AS shift_starts_at,
              TO_CHAR(shift_ends_at,   'YYYY-MM-DD HH24:MI:SS') AS shift_ends_at
         FROM DECLARATIONS
        WHERE declaration_id = :id AND ROWNUM = 1"
    );
    $stmt->execute([':id' => $declarationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Current status of a declaration (latest DECLARATIONS_STATUS value) via the
   * FN_GET_CURRENT_STATUS database function. Null when it has no status rows.
   */
  public function getCurrentStatus(string $declarationId): ?string
  {
    $stmt = $this->db->prepare('SELECT FN_GET_CURRENT_STATUS(:id) AS status FROM dual');
    $stmt->execute([':id' => $declarationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $status = $row['status'] ?? $row['STATUS'] ?? null;
    return $status !== null ? (string) $status : null;
  }

  /** Whether the declaration's current status is 'Incomplete'. */
  public function isIncomplete(string $declarationId): bool
  {
    return $this->getCurrentStatus($declarationId) === 'Incomplete';
  }
}
