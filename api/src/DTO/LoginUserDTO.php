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

  public static function fromArray(array $data): self {
    return new self($data["email"] ?? '', $data["password"] ?? '');
  }

  public function validate(): void {
    // Normalize the email address
    $email = strtolower(trim($this->email) ?? '');

    // Required fields
    if (empty($email) === TRUE) {
      throw new ApiException(ErrorType::missingField("email"));
    }

    if (filter_var($this->email, FILTER_VALIDATE_EMAIL) === FALSE) {
      throw new ApiException(ErrorType::invalidEmail());
    }

    // Email Domain
    [$local, $domain] = explode('@', $email);
    if ($domain !== 'ucr.ac.cr') {
      throw new ApiException(ErrorType::from("INVALID_EMAIL" ,"El dominio de email es inválido"));
    }

    if (empty($this->password) === TRUE) {
      throw new ApiException(ErrorType::missingField("password"));
    }
  }
}