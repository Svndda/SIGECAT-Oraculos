<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * PasswordRecoveryRequestDTO
 *
 * Encapsulates and validates the email submitted to initiate
 * a password recovery request.
 *
 * @NotBlank email
 * @Email    email (must match @ucr.ac.cr domain)
 *
 * @package DTO
 */
final class PasswordRecoveryRequestDTO {
  /** @NotBlank @Email */
  public readonly string $email;

  private function __construct(string $email) {
    $this->email = $email;
  }

  /**
   * @param array{email?: string} $data
   */
  public static function fromArray(array $data): self {
    return new self(
      strtolower(trim((string) ($data['email'] ?? '')))
    );
  }

  public function validate(): void {
    EmailValidator::validate($this->email);
  }
}
