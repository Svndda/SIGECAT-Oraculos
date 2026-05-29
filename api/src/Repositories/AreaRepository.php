<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use DTO\AreaRequestDTO;
use PDO;
use PDOException;

/**
 * AreaRepository
 *
 * Handles all database operations related to the AREAS table.
 * Encapsulates SQL, uses prepared statements, and enforces ACID
 * on write operations.
 */
final class AreaRepository extends Repository {

  public function __construct(PDO $db) {
    parent::__construct($db);
  }

  public function findById(string $areaId): ?array {
    $stmt = $this->db->prepare(
      'SELECT area_id, name, description, created_at, created_by
       FROM AREAS
       WHERE area_id = :area_id
       AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  public function existsByName(string $name, ?string $excludeAreaId = null): bool {
    if ($excludeAreaId !== null) {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM AREAS
         WHERE UPPER(name) = UPPER(:name)
         AND area_id <> :area_id
         AND ROWNUM = 1'
      );
      $stmt->execute([':name' => $name, ':area_id' => $excludeAreaId]);
    } else {
      $stmt = $this->db->prepare(
        'SELECT COUNT(*) AS cnt
         FROM AREAS
         WHERE UPPER(name) = UPPER(:name)
         AND ROWNUM = 1'
      );
      $stmt->execute([':name' => $name]);
    }

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $count = (int) ($row['cnt'] ?? $row['CNT'] ?? 0);
    return $count > 0;
  }

  public function findByNameContaining(string $filter): array {
    $stmt = $this->db->prepare(
      'SELECT area_id, name, description, created_at, created_by
       FROM AREAS
       WHERE UPPER(name) LIKE UPPER(:filter)
       ORDER BY created_at DESC'
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function getAreas(int $offset, int $limit, string $filter = ''): array {
    $stmt = $this->db->prepare(
      'SELECT area_id, name, description, created_at, created_by
       FROM AREAS
       WHERE UPPER(name) LIKE UPPER(:filter)
       ORDER BY created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    );
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  public function countAreas(string $filter = ''): int {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS total
       FROM AREAS
       WHERE UPPER(name) LIKE UPPER(:filter)'
    );
    $stmt->execute([':filter' => '%' . $filter . '%']);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['total'] ?? $row['TOTAL'] ?? 0);
  }

  public function createArea(string $createdBy, AreaRequestDTO $dto): void {
    $newAreaId = UlidGenerator::generate();
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO AREAS (area_id, name, description, created_at, created_by)
         VALUES (:area_id, :name, :description, CURRENT_TIMESTAMP, :created_by)'
      );
      $stmt->execute([
        ':area_id'     => $newAreaId,
        ':name'        => trim($dto->name),
        ':description' => $dto->description !== null ? trim($dto->description) : null,
        ':created_by'  => $createdBy,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function updateArea(string $areaId, AreaRequestDTO $dto): void {
    $fields = [];
    $params = [':area_id' => $areaId];

    $fields[] = 'name = :name';
    $params[':name'] = trim($dto->name);

    if ($dto->description !== null) {
      $fields[] = 'description = :description';
      $params[':description'] = trim($dto->description);
    }

    $sql = 'UPDATE AREAS SET ' . implode(', ', $fields) . ' WHERE area_id = :area_id';

    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare($sql);
      $stmt->execute($params);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function hasChildEntities(string $areaId): bool {
    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM DEPARTMENTS WHERE area_id = :area_id AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ((int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0) {
      return true;
    }

    $stmt = $this->db->prepare(
      'SELECT COUNT(*) AS cnt FROM SECTIONS WHERE area_id = :area_id AND ROWNUM = 1'
    );
    $stmt->execute([':area_id' => $areaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int) ($row['cnt'] ?? $row['CNT'] ?? 0) > 0;
  }

  public function deleteArea(string $areaId): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare('DELETE FROM AREAS WHERE area_id = :area_id');
      $stmt->execute([':area_id' => $areaId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}
