<?php
declare(strict_types=1);

namespace Services;

use DTO\LoginUserDTO;
use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;
use Http\ApiException;
use Http\ErrorType;
use Repositories\UserRepository;
use Repositories\AuthRepository;
use Services\AuthService;

/**
 * UserService
 *
 * Orchestrates all business logic related to users.
 *
 * Responsibilities:
 * - Delegates structural validation to DTOs.
 * - Delegates persistence to UserRepository.
 * - Enforces business rules (duplicate email, invalid credentials,
 *   locked accounts, etc.) by throwing ApiExceptions.
 * - Has no knowledge of HTTP transport (no $_POST, $_SESSION, headers).
 */
class UserService {
  private const MAX_FAILED_ATTEMPTS = 5;

  public function __construct(
    private readonly UserRepository $userRepository,
    private readonly AuthService $authService
  ) {}

  /**
   * Validates credentials and returns the authenticated user data.
   *
   * Business rules:
   * - User must exist.
   * - Account must be active.
   * - Account must not be locked (too many failed attempts).
   * - Password must match the stored hash.
   * - Resets failed-attempt counter on success.
   *
   * @return array<string, mixed>  Authenticated user row (no password_hash).
   * @throws ApiException
   */
  public function login(LoginUserDTO $dto): array {
    $dto->validate();

    $user = $this->userRepository->findByEmail($dto->email);

    if ($user === null) {
      throw new ApiException(ErrorType::from('INVALID_CREDENTIALS', 'Credenciales inválidas'));
    }

    if ((int) $user['is_active'] === 0) {
      throw new ApiException(ErrorType::from('ACCOUNT_INACTIVE', 'La cuenta está desactivada'));
    }

    if ((int) $user['failed_logging_attempts'] >= self::MAX_FAILED_ATTEMPTS) {
      throw new ApiException(ErrorType::from('ACCOUNT_LOCKED', 'La cuenta está bloqueada por demasiados intentos fallidos'));
    }

    if (password_verify($dto->password, $user['password_hash']) === false) {
      $this->userRepository->incrementFailedAttempts($user['user_id']);
      throw new ApiException(ErrorType::from('INVALID_CREDENTIALS', 'Credenciales inválidas'));
    }

    $this->userRepository->resetFailedAttempts($user['user_id']);

    unset($user['password_hash']);
    return $user;
  }


  /**
   * Registers a new user.
   *
   * Business rules:
   * - Email must not already exist.
   * - created_by must correspond to an existing user.
   *
   * @throws ApiException
   */
  public function register(string $createdBy, RegisterUserDTO $dto): void  {
    $dto->validate();

    $existing = $this->userRepository->findByEmail($dto->email);
    if ($existing !== null) {
        throw new ApiException(ErrorType::from('EMAIL_TAKEN', 'El correo ya está registrado'));
    }

    $dto->password = password_hash($dto->password, PASSWORD_BCRYPT);
    $this->userRepository->create($createdBy, $dto);
  }

  /**
   * Applies a partial update to an existing user.
   *
   * Business rules:
   * - Target user must exist.
   * - If email changes, the new one must not belong to another user.
   *
   * @throws ApiException
   */
  public function update(string $userId, UpdateUserDTO $dto): void  {
    $dto->validate();

    if ($dto->email !== null) {
        $emailOwner = $this->userRepository->findByEmail($dto->email);
        if ($emailOwner !== null && $emailOwner['user_id'] !== $userId) {
        throw new ApiException(ErrorType::from('EMAIL_TAKEN', 'El correo ya está en uso por otro usuario'));
        }
    }

    if ($dto->password !== null) {
        $dto->password = password_hash($dto->password, PASSWORD_BCRYPT);
    }

    $this->userRepository->update($userId, $dto);
  }

  /**
   * Returns a user by ID, excluding sensitive fields.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getById(string $userId): array  {
    if (empty($userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    $user = $this->userRepository->findById($userId);
    if ($user === null) {
      throw new ApiException(ErrorType::from('USER_NOT_FOUND', 'El usuario no existe'));
    }

    unset($user['password_hash']);
    return $user;
  }
}