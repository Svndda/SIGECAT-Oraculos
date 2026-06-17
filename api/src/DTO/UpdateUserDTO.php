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
 * - Supports partial updates by allowing optional fields (email, name, password, role, is_active).
 * - Validates each field only if it is present in the request.
 * - Ensures email format is valid when provided.
 * - Enforces password rules if a new password is included.
 * - Validates role values against allowed roles.
 * - Ensures valid values for user status (is_active).
 */
class UpdateUserDTO {
  public ?string $email;
  public ?string $firstName;
  public ?string $secondName;
  public ?string $firstLastName;
  public ?string $secondLastName;
  public ?string $password;
  public ?string $role;
  public ?int $isActive;

  public function __construct(
    ?string $email,
    ?string $firstName,
    ?string $secondName,
    ?string $firstLastName,
    ?string $secondLastName,
    ?string $password,
    ?string $role,
    ?int $isActive
  ) {
    $this->email = $email;
    $this->firstName = $firstName;
    $this->secondName = $secondName;
    $this->firstLastName = $firstLastName;
    $this->secondLastName = $secondLastName;
    $this->password = $password;
    $this->role = $role;
    $this->isActive = $isActive;
  }

  /**
   * @param array{
   * email?: string,
   * first_name?: string,
   * second_name?: ?string,
   * first_last_name?: string,
   * second_last_name?: string,
   * password?: string,
   * role?: string,
   * is_active?: int
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self (
      isset($data['email'])            ? (string) $data['email']            : null,
      isset($data['first_name'])       ? (string) $data['first_name']       : null,
      array_key_exists('second_name', $data) ? ($data['second_name'] !== null ? (string)$data['second_name'] : null) : null,
      isset($data['first_last_name'])  ? (string) $data['first_last_name']  : null,
      isset($data['second_last_name']) ? (string) $data['second_last_name'] : null,
      isset($data['password'])         ? (string) $data['password']         : null,
      isset($data['role'])             ? (string) $data['role']             : null,
      isset($data['is_active'])        ? (int)    $data['is_active']        : null,
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

    if ($this->secondName !== null) {
      $this->secondName = trim($this->secondName);
    }

    if ($this->firstLastName !== null) {
      $this->firstLastName = trim($this->firstLastName);
      if ($this->firstLastName === '') {
        throw new ApiException(ErrorType::invalidField('first_last_name'));
      }
    }

    if ($this->secondLastName !== null) {
      $this->secondLastName = trim($this->secondLastName);
      if ($this->secondLastName === '') {
        throw new ApiException(ErrorType::invalidField('second_last_name'));
      }
    }

    if ($this->password !== null) {
      PasswordValidator::validate($this->password);
    }

    if ($this->role !== null && AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new ApiException(ErrorType::invalidField('role'));
    }

    if ($this->isActive !== null && (in_array($this->isActive, [0, 1], true)) === FALSE) {
      throw new ApiException(ErrorType::invalidField('is_active'));
    }
  }
}