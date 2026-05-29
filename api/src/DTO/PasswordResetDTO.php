<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * PasswordResetDTO
 *
 * Encapsulates and validates the data required to complete a
 * password reset: the single-use token and the new password.
 *
 * @NotBlank token
 * @NotBlank password
 * @NotBlank confirmPassword
 * @Size(min=8) password
 * @Pattern   password (uppercase, number, special char)
 *
 * @package DTO
 */
final class PasswordResetDTO {
  /** @NotBlank */
  public readonly string $token;

  /** @NotBlank @Size(min=8) */
  public readonly string $password;

  /** @NotBlank */
  public readonly string $confirmPassword;

  private function __construct(
    string $token,
    string $password,
    string $confirmPassword
  ) {
    $this->token           = $token;
    $this->password        = $password;
    $this->confirmPassword = $confirmPassword;
  }

  /**
   * @param array{token?: string, password?: string, confirm_password?: string} $data
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data['token']            ?? ''),
      (string) ($data['password']         ?? ''),
      (string) ($data['confirm_password'] ?? ''),
    );
  }

  public function validate(): void {
    if (empty($this->token)) {
      throw new ApiException(ErrorType::missingField('token'));
    }

    if (empty($this->password)) {
      throw new ApiException(ErrorType::missingField('password'));
    }

    if (empty($this->confirmPassword)) {
      throw new ApiException(ErrorType::missingField('confirm_password'));
    }

    if ($this->password !== $this->confirmPassword) {
      throw new ApiException(
        ErrorType::from('PASSWORD_MISMATCH', 'Las contraseñas no coinciden')
      );
    }

    PasswordValidator::validate($this->password);
  }
}
