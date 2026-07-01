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
  public ?string $secondName;
  public string $firstLastName;
  public string $secondLastName;

  public string $password;
  public string $role;

  private function __construct (
    string $email, string $firstName, ?string $secondName,
    string $firstLastName, string $secondLastName,
    string $password, string $role
  ) {
    $this->email = $email;
    $this->firstName = $firstName;
    $this->secondName = $secondName;
    $this->firstLastName = $firstLastName;
    $this->secondLastName = $secondLastName;
    $this->password = $password;
    $this->role = $role;
  }

  /**
   * @param array<string, mixed> $data Raw request payload; keys may be absent.
   */
  public static function fromArray(array $data): self {
    return new self (
      (string) ($data["email"] ?? ''),
      (string) ($data['first_name'] ?? ''),
      (string) ($data['second_name'] ?? null),
      (string) ($data['first_last_name'] ?? ''),
      (string) ($data['second_last_name'] ?? ''),
      (string) ($data['password'] ?? ''),
      (string) ($data['role'] ?? ''),
    );
  }

  public function validate(): void {
    EmailValidator::validate($this->email);
    
    if (empty($this->firstName) === TRUE) {
      throw new ApiException(ErrorType::missingField("first_name"));
    }

    if (empty($this->firstLastName) === TRUE) {
      throw new ApiException(ErrorType::missingField("first_last_name"));
    }

    if (empty($this->secondLastName) === TRUE) {
      throw new ApiException(ErrorType::missingField("second_last_name"));
    }

    // Length limits mirror the USERS columns, so an over-long value is rejected
    // with a clear message instead of bubbling up as an ORA-12899 database error.
    if (strlen($this->firstName) > 25) {
      throw new ApiException(ErrorType::invalidField("first_name", "No puede exceder los 25 caracteres"));
    }

    if ($this->secondName !== null && strlen($this->secondName) > 55) {
      throw new ApiException(ErrorType::invalidField("second_name", "No puede exceder los 55 caracteres"));
    }

    if (strlen($this->firstLastName) > 55) {
      throw new ApiException(ErrorType::invalidField("first_last_name", "No puede exceder los 55 caracteres"));
    }

    if (strlen($this->secondLastName) > 55) {
      throw new ApiException(ErrorType::invalidField("second_last_name", "No puede exceder los 55 caracteres"));
    }

    if (empty($this->password) === TRUE) {
      throw new ApiException(ErrorType::missingField("password"));
    }

    PasswordValidator::validate($this->password);

    if (AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new ApiException(ErrorType::invalidField("role"));
    }
  }
}