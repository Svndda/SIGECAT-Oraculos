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
  public string $firstname;
  public string $lastname;
  public string $password;
  public string $jobClassId;
  public string $role;
  public string $createdBy;

  private function __construct (string $email, string $firstname,
      string $lastname, string $password, string $jobClassId, string $role,
      string $createdBy) {
    $this->email = $email;
    $this->firstname = $firstname;
    $this->lastname = $lastname;
    $this->password = $password;
    $this->jobClassId = $jobClassId;
    $this->role = $role;
    $this->createdBy = $createdBy;
  }

  /**
   * @param array{
   * email?: string,
   * first_name?: string,
   * last_name?: string,
   * password?: string,
   * job_class_id?: string,
   * role?: string,
   * created_by?: string
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
      (string) ($data['created_by'] ?? '')
    );
  }

  public function validate(): void {
    EmailValidator::validate($this->email);
    
    if (empty($this->firstname) === TRUE) {
      throw new ApiException(ErrorType::missingField("firstname"));
    }

    if (empty($this->lastname) === TRUE) {
      throw new ApiException(ErrorType::missingField("lastname"));
    }

    if (empty($this->password) === TRUE) {
      throw new ApiException(ErrorType::missingField("password"));
    }

    PasswordValidator::validate($this->password);

    if (empty($this->jobClassId) === TRUE) {
      throw new ApiException(ErrorType::missingField("jobClassId"));
    }

    if (AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new ApiException(ErrorType::invalidField("role"));
    }
  }
}