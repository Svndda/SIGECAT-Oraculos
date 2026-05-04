<?php
declare(strict_types= 1);

/**
 * UpdateUserDTO
 * 
 * Encapsulates and validates the data used to update an existing user.
 * 
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Ensures the user identifier (user_id) is provided.
 * - Supports partial updates by allowing optional fields (email, name, password, role, job class, is_active).
 * - Validates each field only if it is present in the request.
 * - Ensures email format is valid when provided.
 * - Enforces password rules if a new password is included.
 * - Validates role values against allowed roles.
 * - Ensures valid values for user status (is_active).
 */
class UpdateUserDTO {
  public string $userId;
  public ?string $email;
  public ?string $firstName;
  public ?string $lastName;
  public ?string $password;
  public ?string $jobClassId;
  public ?string $role;
  public ?int $isActive;

  public function __construct(string $userId, ?string $email, 
      ?string $firstName, ?string $lastName, ?string $password,
      ?string $jobClassId, ?string $role, ?string $isActive) {
    $this->userId = $userId;
    $this->email = $email;
    $this->firstName = $firstName;
    $this->lastName = $lastName;
    $this->password = $password;
    $this->jobClassId = $jobClassId;
    $this->role = $role;
    $this->isActive = $isActive;
  }

  public static function fromArray(array $data): self {
  return new self (
    $data["user_id"] ?? '',
    $data["email"] ?? null,
    $data['first_name'] ?? null,
    $data['last_name'] ?? null,
    $data['password'] ?? null,
    $data['job_class_id'] ?? null,
    $data['role'] ?? null,
    $data['is_active'] ?? null);
  }

  public function validate(): void {
    if (empty($this->userId) === TRUE) {
      throw new InvalidArgumentException("El identificador del usuario es obligatorio");
    } 
    
    if ($this->email !== null) {
      // Normalize the email address
      $email = strtolower(trim($this->email));
      if (filter_var($email, FILTER_VALIDATE_EMAIL) === FALSE) {
        throw new InvalidArgumentException('Formato de email inválido');
      }
    }

    if ($this->password !== null) {
      PasswordValidator::validate($this->password);
    }

     if (AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new InvalidArgumentException('Rol inválido');
    }

    if ($this->isActive !== null && (in_array($this->isActive, [0,1])) === FALSE) {
      throw new InvalidArgumentException("Valor inválido para definir el usuario activo");
    }
  }
}