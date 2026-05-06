<?php
declare(strict_types=1);

namespace Repositories;

use PDO;
use PDOException;
use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;

/**
 * UserRepository
 *
 * Handles all database operations related to the USER table.
 * Encapsulates SQL, uses prepared statements, and enforces ACID
 * on write operations.
 */
final class UserRepository extends Repository {
  /**
   * Constructs the AuthRepository with a database connection.
   *
   * @param PDO $db The active PDO database connection.
   */
  public function __construct(PDO $db) {
    parent::__construct($db);
  }

  public function findById(string $userId): ?array{
    $stmt = $this->db->prepare(
      'SELECT user_id, role, email,
              first_name, last_name, password_hash,
              is_active, is_password_temp, failed_logging_attempts,
              created_at, created_by
       FROM USER
       WHERE user_id = :user_id
       LIMIT 1'
    );
    $stmt->execute([':user_id' => $userId]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  public function findByEmail(string $email): ?array {
    $stmt = $this->db->prepare(
      'SELECT user_id, role, email,
              first_name, last_name, password_hash,
              is_active, is_password_temp, failed_logging_attempts
       FROM USER
       WHERE email = :email
       LIMIT 1'
    );
    $stmt->execute([':email' => $email]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row !== false ? $row : null;
  }

  public function create(string $createdBy, RegisterUserDTO $dto): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'INSERT INTO USER
          (role, job_class_id, email, first_name, last_name,
            password_hash, is_active, is_password_temp,
            failed_logging_attempts, created_by)
        VALUES
          (:role, :job_class_id, :email, :first_name, :last_name,
            :password_hash, 1, 1, 0, :created_by)'
      );

      $stmt->execute([
        ':role'          => $dto->role,
        ':job_class_id'  => $dto->jobPosition,
        ':email'         => strtolower(trim($dto->email)),
        ':first_name'    => trim($dto->firstName),
        ':last_name'     => trim($dto->lastName),
        ':password_hash' => $dto->password,
        ':created_by'    => $createdBy
      ]);

      $this->commit();
    } catch (PDOException $e) {
      $this->rollBack();
      throw $e;
    }
  }

  public function update(string $userId, UpdateUserDTO $dto): void {
    // Build SET clause dynamically from non-null fields
    $fields = [];
    $params = [':user_id' => $userId];

    if ($dto->email !== null) {
      $fields[] = 'email = :email';
      $params[':email'] = strtolower(trim($dto->email));
    }
    if ($dto->firstName !== null) {
      $fields[] = 'first_name = :first_name';
      $params[':first_name'] = trim($dto->firstName);
    }
    if ($dto->lastName !== null) {
      $fields[] = 'last_name = :last_name';
      $params[':last_name'] = trim($dto->lastName);
    }
    if ($dto->password !== null) {
      $fields[] = 'password_hash = :password_hash';
      $params[':password_hash'] = $dto->password;
    }
    if ($dto->jobPosition !== null) {
      $fields[] = 'job_class_id = :job_class_id';
      $params[':job_class_id'] = $dto->jobPosition;
    }
    if ($dto->role !== null) {
      $fields[] = 'role = :role';
      $params[':role'] = $dto->role;
    }
    if ($dto->isActive !== null) {
      $fields[] = 'is_active = :is_active';
      $params[':is_active'] = $dto->isActive;
    }

    if (empty($fields)) {
      throw new \RuntimeException('No fields provided for update.');
    }

    $sql = 'UPDATE USER SET ' . implode(', ', $fields)
         . ' WHERE user_id = :user_id';

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

  public function incrementFailedAttempts(string $userId): void {
    $this->beginTransaction();
    try {
      $stmt = $this->db->prepare(
        'UPDATE USER
         SET failed_logging_attempts = failed_logging_attempts + 1
         WHERE user_id = :user_id'
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
        'UPDATE USER
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
}