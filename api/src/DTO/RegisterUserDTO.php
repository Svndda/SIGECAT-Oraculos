<?php 
declare(strict_types= 1);

namespace DTO;
use Http\ApiException;
use Http\ErrorType;

/**
 * RegisterUserDTO
 * 
 * Encapsulates and validates the data required to register a new user.
 * 
 * Responsibilities:
 * - Maps incoming request data to a structured object using fromArray().
 * - Validates all required fields (email, first name, last name, password, job class, role, created_by).
 * - Ensures email format is correct and belongs to the institutional domain (@ucr.ac.cr).
 * - Enforces password security rules (minimum length, uppercase, numeric, and special characters).
 * - Validates that the provided role is allowed.
 */
class RegisterUserDTO {
  public string $email;
  public string $firstName;
  public string $lastName;
  public string $password;
  public string $jobPosition;
  public string $role;

  private function __construct (string $email, string $firstName,
      string $lastName, string $password, string $jobPosition, string $role) {
    $this->email = $email;
    $this->firstName = $firstName;
    $this->lastName = $lastName;
    $this->password = $password;
    $this->jobPosition = $jobPosition;
    $this->role = $role;
  }

  /**
   * @param array{
   * email?: string,
   * first_name?: string,
   * last_name?: string,
   * password?: string,
   * job_class_id?: string,
   * role?: string,
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self (
      (string) ($data["email"] ?? ''),
      (string) ($data['first_name'] ?? ''),
      (string) ($data['last_name'] ?? ''),
      (string) ($data['password'] ?? ''),
      (string) ($data['job_class_id'] ?? ''),
      (string) ($data['role'] ?? ''),
    );
  }

  public function validate(): void {
    EmailValidator::validate($this->email);
    
    if (empty($this->firstName) === TRUE) {
      throw new ApiException(ErrorType::missingField("firstName"));
    }

    if (empty($this->lastName) === TRUE) {
      throw new ApiException(ErrorType::missingField("lastName"));
    }

    if (empty($this->password) === TRUE) {
      throw new ApiException(ErrorType::missingField("password"));
    }

    PasswordValidator::validate($this->password);

    if (empty($this->jobPosition) === TRUE) {
      throw new ApiException(ErrorType::missingField("jobClassId"));
    }

    if (AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new ApiException(ErrorType::invalidField("role"));
    }
  }
}