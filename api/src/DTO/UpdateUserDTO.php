<?php
declare(strict_types= 1);

namespace DTO;
use Http\ApiException;
use Http\ErrorType;

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
  public ?string $email;
  public ?string $firstName;
  public ?string $lastName;
  public ?string $password;
  public ?string $jobPosition;
  public ?string $role;
  public ?int $isActive;

  public function __construct(?string $email, 
      ?string $firstName, ?string $lastName, ?string $password,
      ?string $jobPosition, ?string $role, ?int $isActive) {
    $this->email = $email;
    $this->firstName = $firstName;
    $this->lastName = $lastName;
    $this->password = $password;
    $this->jobPosition = $jobPosition;
    $this->role = $role;
    $this->isActive = $isActive;
  }

  /**
   * @param array{
   *   email?: string,
   *   first_name?: string,
   *   last_name?: string,
   *   password?: string,
   *   job_class_id?: string,
   *   role?: string,
   *   is_active?: int
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self (
      isset($data['email'])        ? (string) $data['email']        : null,
      isset($data['first_name'])   ? (string) $data['first_name']   : null,
      isset($data['last_name'])    ? (string) $data['last_name']    : null,
      isset($data['password'])     ? (string) $data['password']     : null,
      isset($data['job_class_id']) ? (string) $data['job_class_id'] : null,
      isset($data['role'])         ? (string) $data['role']         : null,
      isset($data['is_active'])    ? (int)    $data['is_active']    : null,
    );
  }

  public function validate(): void {
    if ($this->email !== null) {
      EmailValidator::validate($this->email);
    }

    if ($this->firstName !== null) {
      $this->firstName = trim($this->firstName);

      if ($this->firstName === '') {
        throw new ApiException(ErrorType::invalidField('first_name'));
      }
    }

    if ($this->lastName !== null) {
      $this->lastName = trim($this->lastName);

      if ($this->lastName === '') {
        throw new ApiException(ErrorType::invalidField('last_name'));
      }
    }
    
    if ($this->password !== null) {
      PasswordValidator::validate($this->password);
    }
    
    if ($this->role !== null && AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new ApiException(ErrorType::invalidField('role'));
    }

    if ($this->isActive !== null && (in_array($this->isActive, [0,1], true)) === FALSE) {
      throw new ApiException(ErrorType::invalidField('is_active'));
    }
  }
}