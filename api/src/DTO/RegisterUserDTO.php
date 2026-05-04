<?php 
declare(strict_types= 1);

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
      string $lastname, string $password, string $jobClassID, string $role,
      string $createdBy) {
    $this->email = $email;
    $this->firstname = $firstname;
    $this->lastname = $lastname;
    $this->password = $password;
    $this->jobClassId = $jobClassID;
    $this->role = $role;
    $this->createdBy = $createdBy;
  }

  public static function fromArray(array $data): self {
    return new self (
      $data["email"] ?? '',
      $data['first_name'] ?? '',
      $data['last_name'] ?? '',
      $data['password'] ?? '',
      $data['job_class_id'] ?? '',
      $data['role'] ?? '',
      $data['created_by'] ?? ''
    );
  }

  public function validate(): void {
    // Normalize the email address
    $email = strtolower(trim($this->email) ?? '');

    // Required fields
    if (empty($email) === TRUE) {
      throw new InvalidArgumentException('El correo es obligatorio');
    }

    if (filter_var($this->email, FILTER_VALIDATE_EMAIL) === FALSE) {
      throw new InvalidArgumentException('Formato de email inválido');
    }

    // Email Domain
    [$local, $domain] = explode('@', $email);
    if ($domain !== 'ucr.ac.cr') {
      throw new InvalidArgumentException('El email debe pertenecer al dominio @ucr.ac.cr');
    }
    
    if (empty($this->firstname) === TRUE) {
      throw new InvalidArgumentException('El nombre es obligatorio');
    }

    if (empty($this->lastname) === TRUE) {
      throw new InvalidArgumentException('El apellido es obligatorio');
    }

    if (empty($this->password) === TRUE ) {
      throw new InvalidArgumentException('La contraseña es obligatoria');
    }
    
    PasswordValidator::validate($this->password);

    if (empty($this->jobClassId) === TRUE) {
      throw new InvalidArgumentException('El job class id es obligatorio');
    }

    if (AllowedUserRoles::isValid($this->role) === FALSE) {
      throw new InvalidArgumentException('Rol inválido');
    }

    if (empty($this->createdBy) === TRUE) {
      throw new InvalidArgumentException('Created_by es obligatorio');
    }
  }
}