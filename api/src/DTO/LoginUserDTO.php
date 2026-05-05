<?php
declare(strict_types= 1);

namespace DTO;
use Http\ApiException;
use Http\ErrorType;

/**
 * LoginUserDTO
 * 
 * Encapsulates and validates the data required for user authentication.
 * 
 * Responsibilities:
 * - Maps incoming request data (email and password) using fromArray().
 * - Validates required fields.
 * - Ensures email format is correct and belongs to the institutional domain (@ucr.ac.cr)..
 */
class LoginUserDTO {
  public string $email;
  public string $password;

  public function __construct(string $email, string $password) {
    $this->email = $email;
    $this->password = $password;
  }

  /** 
   * @param array{email?: string, password?: string} $data 
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data["email"] ?? ''), 
      (string) ($data["password"] ?? '')
    );
  }

  public function validate(): void {
    EmailValidator::validate($this->email);
    
    if (empty($this->password) === TRUE) {
      throw new ApiException(ErrorType::missingField("password"));
    }
  }
}