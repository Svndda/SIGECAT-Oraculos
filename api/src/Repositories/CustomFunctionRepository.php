<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\CreateCustomFunctionDTO;
use PDO;
use PDOException;

/**
 * CustomFunctionRepository
 *
 * Data access for CUSTOM_FUNCTIONS: employee-defined functions. Each row is
 * owned by the user that created it (user_id). The table has no soft-delete and
 * exposes only creation and reads (no update/delete) by design.
 *
 * @package Repositories
 */
final class CustomFunctionRepository extends Repository
{
  public function __construct(PDO $db)
  {
    parent::__construct($db);
  }

  /** Creates a custom function owned by the given user. Returns the new id. */
  public function createCustomFunction(string $userId, CreateCustomFunctionDTO $dto): string
  {
    $newId = UlidGenerator::generate();

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO CUSTOM_FUNCTIONS (custom_function_id, user_id, name, description)
         VALUES (:id, :user_id, :name, :description)'
      );
      $stmt->execute([
        ':id'          => $newId,
        ':user_id'     => $userId,
        ':name'        => trim($dto->name),
        ':description' => $dto->description !== null ? trim($dto->description) : null,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }

    return $newId;
  }

  /** @return array<string, mixed>|null */
  public function findById(string $customFunctionId): ?array
  {
    $stmt = $this->db->prepare(
      'SELECT custom_function_id, user_id, name, description
         FROM CUSTOM_FUNCTIONS
        WHERE custom_function_id = :id AND ROWNUM = 1'
    );
    $stmt->execute([':id' => $customFunctionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  /**
   * Whether an active custom function with the given name already exists for
   * the same owner (case-insensitive).
   */
  public function existsByName(string $name, string $userId): bool
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM CUSTOM_FUNCTIONS
        WHERE UPPER(name) = UPPER(:name) AND user_id = :user_id'
    );
    $stmt->execute([':name' => $name, ':user_id' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  /** @return array<int, array<string, mixed>> */
  public function getCustomFunctions(int $offset, int $limit, string $filter, string $userId): array
  {
    $stmt = $this->db->prepare(
      'SELECT custom_function_id, user_id, name, description
         FROM CUSTOM_FUNCTIONS
        WHERE user_id = :user_id AND UPPER(name) LIKE UPPER(:filter)
        ORDER BY name ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':user_id', $userId);
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countCustomFunctions(string $filter, string $userId): int
  {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total FROM CUSTOM_FUNCTIONS
        WHERE user_id = :user_id AND UPPER(name) LIKE UPPER(:filter)'
    );
    $stmt->execute([':user_id' => $userId, ':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }
}
