<?php
declare(strict_types=1);

class PasswordValidator {
  private const PASSWORD_LENGTH = 8;
  public static function validate(string $password): void {
    if (strlen($password) < self::PASSWORD_LENGTH) {
      throw new InvalidArgumentException("La contraseña debe tener mínimo "
          . self::PASSWORD_LENGTH . " caracteres");
    }

    if (!preg_match('/[A-Z]/', $password)) {
      throw new InvalidArgumentException("La contraseña debe tener al menos una mayúscula");
    }

    if (!preg_match('/[0-9]/', $password)) {
      throw new InvalidArgumentException("La contraseña debe tener al menos un número");
    }

    if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
      throw new InvalidArgumentException("La contraseña debe tener al menos un caracter especial");
    }
  }
}