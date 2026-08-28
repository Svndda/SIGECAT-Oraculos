<?php
declare(strict_types=1);

namespace Repositories;

use Core\UlidGenerator;
use PDO;
use PDOException;
use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;

/**
 * UserRepository
 *
 * Handles all database operations related to the USER table.
 * Encapsulates SQL, uses prepared statements, and enforces ACID
 * on write operations. Includes soft delete mapping.
 */
final class UserRepository extends Repository {

  public function __construct(PDO $db) {
    parent::__construct($db);
  }

  /**
   * Evaluates query filter conditions for isolation of logical deletion records.
   */
  private function statusCondition(string $status): string
  {
    return match ($status) {
      'deleted' => ' AND is_deleted = 1',
      'all'     => '',
      default   => ' AND is_deleted = 0',
    };
  }

  /** @return array<string, mixed>|null */
  public function findById(
    string $userId,
    string $status = 'active',
    bool $includeSensitiveInfo = true
  ): ?array {

    $columns = [
      'user_id',
      'role',
      'email',
      'first_name',
      'second_name',
      'first_last_name',
      'second_last_name',
      'created_at',
      'created_by'
    ];

    if ($includeSensitiveInfo) {
      $columns = array_merge(
        $columns,
        [
          'password_hash',
          'is_active',
          'is_password_temp',
          'failed_logging_attempts',
          'is_deleted',
          'deleted_at',
          'deleted_by'
        ]
      );
    }

    $sql = sprintf(
      'SELECT %s
     FROM USERS
     WHERE user_id = :user_id%s
     AND ROWNUM = 1',
      implode(', ', $columns),
      $this->statusCondition($status)
    );

    $stmt = $this->db->prepare($sql);

    $stmt->execute([
      ':user_id' => $userId
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row !== false ? $row : null;
  }

  /**
   * Bulk-fetches users by ID, keyed by user_id. Used to avoid an N+1 lookup
   * when enriching a page of list results (e.g. the admin declarations list).
   *
   * @param list<string> $userIds
   * @return array<string, array<string, mixed>>
   */
  public function findByIds(
    array $userIds,
    string $status = 'active',
    bool $includeSensitiveInfo = false
  ): array {
    $ids = array_values(array_unique($userIds));
    if (count($ids) === 0) {
      return [];
    }

    $columns = [
      'user_id', 'role', 'email', 'first_name', 'second_name',
      'first_last_name', 'second_last_name', 'created_at', 'created_by'
    ];
    if ($includeSensitiveInfo) {
      $columns = array_merge($columns, [
        'password_hash', 'is_active', 'is_password_temp',
        'failed_logging_attempts', 'is_deleted', 'deleted_at', 'deleted_by'
      ]);
    }

    $placeholders = [];
    $params = [];
    foreach ($ids as $i => $id) {
      $key = ':id' . $i;
      $placeholders[] = $key;
      $params[$key] = $id;
    }

    $stmt = $this->db->prepare(sprintf(
      'SELECT %s FROM USERS WHERE user_id IN (%s)%s',
      implode(', ', $columns),
      implode(', ', $placeholders),
      $this->statusCondition($status)
    ));
    $stmt->execute($params);

    $byId = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $byId[$row['user_id']] = $row;
    }
    return $byId;
  }

  /** @return array<string, mixed>|null */
  public function findByEmail(string $email, string $status = 'active'): ?array {
    $stmt = $this->db->prepare(
      'SELECT user_id, role, email,
              first_name, second_name, first_last_name, second_last_name,
              password_hash, is_active, is_password_temp,
              failed_logging_attempts, last_failed_attempt_at, created_at, created_by,
              is_deleted, deleted_at, deleted_by
       FROM USERS
       WHERE email = :email' . $this->statusCondition($status) . '
       AND ROWNUM = 1'
    );
    $stmt->execute([':email' => $email]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  public function create(string $createdBy, RegisterUserDTO $dto): string {
    $newUserId = UlidGenerator::generate();
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO USERS
        ( user_id, role, email,
          first_name, second_name, first_last_name, second_last_name,
          password_hash, is_active, is_password_temp,
          failed_logging_attempts, created_by, created_at
          )
      VALUES (
         :user_id, :role, :email,
         :first_name, :second_name, :first_last_name, :second_last_name,
         :password_hash, 1, 1, 0, :created_by, CURRENT_TIMESTAMP
         )'
      );

      $stmt->execute([
        ':user_id'          => $newUserId,
        ':role'             => $dto->role,
        ':email'            => strtolower(trim($dto->email)),
        ':first_name'       => trim($dto->firstName),
        ':second_name'      => $dto->secondName !== null ? trim($dto->secondName) : null,
        ':first_last_name'  => trim($dto->firstLastName),
        ':second_last_name' => trim($dto->secondLastName),
        ':password_hash'    => $dto->password,
        ':created_by'       => $createdBy
      ]);

      $this->commit();
      return $newUserId;
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function update(string $userId, UpdateUserDTO $dto): void {
    $fields = [];
    $params = [':user_id' => $userId];

    if ($dto->email !== null) {
      $fields[] = 'email = :email';
      $params[':email'] = strtolower(trim($dto->email));
    }
    if ($dto->firstName !== null) {
      $fields[] = 'first_name = :first_name';
      $params[':first_name'] = $dto->firstName;
    }
    if ($dto->secondName !== null) {
      $fields[] = 'second_name = :second_name';
      $params[':second_name'] = $dto->secondName;
    }
    if ($dto->firstLastName !== null) {
      $fields[] = 'first_last_name = :first_last_name';
      $params[':first_last_name'] = $dto->firstLastName;
    }
    if ($dto->secondLastName !== null) {
      $fields[] = 'second_last_name = :second_last_name';
      $params[':second_last_name'] = $dto->secondLastName;
    }
    if ($dto->password !== null) {
      $fields[] = 'password_hash = :password_hash';
      $fields[] = 'is_password_temp = 0';
      $params[':password_hash'] = $dto->password;
    }
    if ($dto->role !== null) {
      $fields[] = 'role = :role';
      $params[':role'] = $dto->role;
    }
    if ($dto->isActive !== null) {
      $fields[] = 'is_active = :is_active';
      $params[':is_active'] = $dto->isActive ? 1 : 0;
    }

    if (empty($fields)) {
      throw new \RuntimeException('No fields provided for update.');
    }

    $sql = 'UPDATE USERS SET ' . implode(', ', $fields) . ' WHERE user_id = :user_id AND is_deleted = 0';

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

  public function updateRole(string $userId, string $role): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE USERS SET role = :role
         WHERE user_id = :user_id AND is_deleted = 0'
      );
      $stmt->execute([':role' => $role, ':user_id' => $userId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Fetches a page of users along with the total matching row count, in a
   * single round trip (COUNT(*) OVER()) instead of a separate COUNT(*) query.
   *
   * @return array{data: list<array<string, mixed>>, total: int}
   */
  public function findAllPaginated(int $limit, int $offset, string $filter = '', string $status = 'active'): array
  {
    $sql = '
        SELECT user_id, role, email, first_name, second_name, first_last_name, second_last_name,
               is_active, is_password_temp, failed_logging_attempts, created_at, created_by,
               is_deleted, deleted_at, deleted_by,
               COUNT(*) OVER() AS total_count
        FROM USERS
        WHERE (UPPER(first_name) LIKE UPPER(:filter)
           OR UPPER(first_last_name) LIKE UPPER(:filter)
           OR UPPER(email) LIKE UPPER(:filter))' . $this->statusCondition($status) . '
        ORDER BY created_at DESC
        OFFSET :v_offset ROWS FETCH NEXT :v_limit ROWS ONLY
    ';

    $stmt = $this->db->prepare($sql);
    $stmt->bindValue(':filter', '%' . $filter . '%');
    $stmt->bindValue(':v_offset', $offset, PDO::PARAM_INT);
    $stmt->bindValue(':v_limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $this->splitWindowedTotal($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  public function delete(string $userId, string $deletedBy): void
  {
    $this->beginTransaction();
    try {
      $sql = '
          UPDATE USERS 
          SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :deleted_by, is_active = 0
          WHERE user_id = :user_id AND is_deleted = 0
      ';
      $stmt = $this->db->prepare($sql);
      $stmt->execute([
        ':deleted_by' => $deletedBy,
        ':user_id'    => $userId
      ]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function restore(string $userId): void
  {
    $this->beginTransaction();
    try {
      $sql = '
          UPDATE USERS 
          SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, is_active = 1
          WHERE user_id = :user_id AND is_deleted = 1
      ';
      $stmt = $this->db->prepare($sql);
      $stmt->execute([':user_id' => $userId]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function incrementFailedAttempts(string $userId): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        "UPDATE USERS
         SET failed_logging_attempts = failed_logging_attempts + 1,
             last_failed_attempt_at = CURRENT_TIMESTAMP
         WHERE user_id = :user_id"
      );
      $stmt->execute([':user_id' => $userId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function resetFailedAttempts(string $userId): void
  {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE USERS
         SET failed_logging_attempts = 0
         WHERE user_id = :user_id'
      );
      $stmt->execute([':user_id' => $userId]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function updatePasswordById(string $userId, string $hashedPassword): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE USERS
         SET password_hash = :password_hash,
             is_password_temp = 0,
             failed_logging_attempts = 0
         WHERE user_id = :user_id'
      );
      $stmt->execute([
        ':password_hash' => $hashedPassword,
        ':user_id'       => $userId,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  /**
   * Silently updates only the password hash, without touching
   * is_password_temp or failed_logging_attempts. Used to transparently
   * migrate a user's stored hash to a stronger algorithm after a
   * successful login, which is not a password-change event.
   */
  public function updatePasswordHashById(string $userId, string $hashedPassword): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE USERS
         SET password_hash = :password_hash
         WHERE user_id = :user_id'
      );
      $stmt->execute([
        ':password_hash' => $hashedPassword,
        ':user_id'       => $userId,
      ]);
      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }
}