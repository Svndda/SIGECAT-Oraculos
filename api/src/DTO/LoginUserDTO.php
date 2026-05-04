<?php
declare(strict_types= 1);
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

  private function __construct(string $email, string $password) {
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
    if (empty($email)) {
      throw new InvalidArgumentException('El correo es obligatorio');
    }

    if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
      throw new InvalidArgumentException('Formato de email inválido');
    }

    // Email Domain
    [$local, $domain] = explode('@', $email);
    if ($domain !== 'ucr.ac.cr') {
      throw new InvalidArgumentException('Dominio de email inválido');
    }

    if (empty($this->password)) {
      throw new InvalidArgumentException('La contraseña es obligatoria');
    }
  }
}