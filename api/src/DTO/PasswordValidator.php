<?php
declare(strict_types=1);

namespace DTO;
use Http\ApiException;
use Http\ErrorType;

/**
 * Validates a password.
 *
 * Checks that:
 * - The password is not empty
 * - It has at least 8 characters
 * - It includes an uppercase letter
 * - It includes a number
 * - It includes a special character
 *
 * Throws an ApiException if any rule is not met.
 */
class PasswordValidator {
  private const PASSWORD_LENGTH = 8;
  public static function validate(string $password): void {
    if (strlen($password) < self::PASSWORD_LENGTH) {
      throw new ApiException(
        ErrorType::from(
          "WEAK_PASSWORD",
          "La contraseña debe tener mínimo " . self::PASSWORD_LENGTH . " caracteres"
        ) 
      );
    }

    if (preg_match('/[A-Z]/', $password) === 0) {
      throw new ApiException(
        ErrorType::from(
          "WEAK_PASSWORD",
          "La contraseña debe tener al menos una mayúscula"
        )
      );
    }

    if (preg_match('/[0-9]/', $password) === 0) {
      throw new ApiException(
        ErrorType::from(
          "WEAK_PASSWORD",
          "La contraseña debe tener al menos un número"
        )
      );
    }

    if (preg_match('/[^a-zA-Z0-9]/', $password) === 0) {
      throw new ApiException(
        ErrorType::from(
          "WEAK_PASSWORD",
          "La contraseña debe tener al menos un caracter especial"
        )
      );
    }
  }
}