<?php
declare(strict_types=1);

namespace Services;

use DTO\AllowedUserRoles;
use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;
use DTO\UserResponseDTO;
use DTO\PasswordValidator;
use Http\ApiException;
use Http\ErrorType;
use Repositories\UserRepository;
use PDO;

/**
 * UserService
 *
 * Orchestrates business logic related to user profile management.
 * Relies on UserRepository for persistence.
 */
class UserService
{
  private UserRepository $userRepository;

  public function __construct(private PDO $pdo)
  {
    $this->userRepository = new UserRepository($this->pdo);
  }

  /**
   * Normalizes the status filter.
   *
   * @throws ApiException
   */
  private function normalizeStatus(string $status): string
  {
    $normalized = $status === '' ? 'active' : strtolower($status);
    if (!in_array($normalized, ['active', 'deleted', 'all'], true)) {
      throw new ApiException(ErrorType::invalidField('status'));
    }
    return $normalized;
  }

  /**
   * Registers a new user.
   *
   * @throws ApiException
   */
  public function register(string $createdBy, RegisterUserDTO $dto): void
  {
    $dto->validate();

    $existing = $this->userRepository->findByEmail($dto->email);
    if ($existing !== null) {
      throw new ApiException(
        ErrorType::from(
          'EMAIL_TAKEN', 'El correo ya está registrado'
        ), 409
      );
    }

    $dto->password = password_hash($dto->password, PASSWORD_ARGON2ID);
    $user_id = $this->userRepository->create($createdBy, $dto);

    Logger::info('user', 'Usuario registrado', 'user.create', [
      'email'      => $dto->email,
      'role'       => $dto->role,
      'created_by' => $createdBy,
    ]);
  }

  /**
   * Applies a partial update to an existing user.
   *
   * @throws ApiException
   */
  public function update(string $userId, UpdateUserDTO $dto): void
  {
    $dto->validate();

    if ($dto->email !== null) {
      $emailOwner = $this->userRepository->findByEmail(
        $dto->email, 'all'
      );
      if ($emailOwner !== null && $emailOwner['user_id'] !== $userId) {
        throw new ApiException(
          ErrorType::from(
            'EMAIL_TAKEN',
            'El correo ya está en uso por otro usuario'
          )
        );
      }
    }

    if ($dto->password !== null) {
      $dto->password = password_hash($dto->password, PASSWORD_ARGON2ID);
    }

    $this->userRepository->update($userId, $dto);
  }

  /**
   * Changes the authenticated user's password.
   *
   * Business rules:
   * - Current password is required and must match the stored hash.
   * - New password must satisfy the strength policy.
   *
   * @throws ApiException
   */
  public function changePassword(string $userId, string $currentPassword, string $newPassword): void
  {
    if ($currentPassword === '') {
      throw new ApiException(ErrorType::missingField('current_password'));
    }
    if ($newPassword === '') {
      throw new ApiException(ErrorType::missingField('new_password'));
    }

    // Enforce the new password strength policy.
    PasswordValidator::validate($newPassword);

    $user = $this->userRepository->findById($userId);
    if ($user === null) {
      throw new ApiException(ErrorType::from('USER_NOT_FOUND', 'El usuario no existe'));
    }

    // Verify the current password against the stored hash.
    if (password_verify($currentPassword, (string)$user['password_hash']) === false) {
      throw new ApiException(
        ErrorType::from('INVALID_CREDENTIALS', 'La contraseña actual es incorrecta')
      );
    }

    $hashed = password_hash($newPassword, PASSWORD_ARGON2ID);
    $this->userRepository->updatePasswordById($userId, $hashed);

    Logger::info('security', 'Contraseña actualizada por el usuario', 'user.change_password', [
      'user_id' => $userId,
    ]);
  }

  /**
   * Returns a user by ID, excluding sensitive fields.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getById(string $userId, string $status = 'active'): array
  {
    if (empty($userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    $status = $this->normalizeStatus($status);
    $user = $this->userRepository->findById($userId, $status);

    if ($user === null) {
      throw new ApiException(
        ErrorType::from('USER_NOT_FOUND', 'El usuario no existe')
      );
    }

    return UserResponseDTO::fromArray($user)->toArray();
  }

  /**
   * Compiles filter sets to fetch pagination groups of users.
   *
   * @return array<string, mixed>
   */
  public function getAllUsers(
    int    $page = 1,
    int    $limit = 10,
    string $filter = '',
    string $status = 'active'
  ): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->userRepository->countAll($filter, $status);
    $users = $this->userRepository->findAllPaginated(
      $limit, $offset, $filter, $status
    );

    $data = array_map(
      static fn(array $row) => UserResponseDTO::fromArray($row)->toArray(),
      $users
    );

    return [
      'data' => $data,
      'meta' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => (int)ceil($total / $limit)
      ]
    ];
  }

  /**
   * Executes logical deletion mechanisms onto a specific user record.
   *
   * @throws ApiException
   */
  public function deleteUser(string $userId, string $deletedBy): void
  {
    if (empty($userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    $existing = $this->userRepository->findById($userId, 'active');
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('USER_NOT_FOUND', 'El usuario no existe')
      );
    }

    if ($userId === $deletedBy) {
      throw new ApiException(
        ErrorType::conflict('No puedes eliminar tu propia cuenta de usuario')
      );
    }

    // A regular admin cannot delete another admin; the target must be demoted
    // first. (A future "técnico admin" role is intended to lift this rule.)
    if (($existing['role'] ?? null) === 'admin') {
      throw new ApiException(
        ErrorType::from(
          'CANNOT_DELETE_ADMIN',
          'No puede eliminar a un administrador. Cambie su rol a empleado antes de eliminarlo.'
        )
      );
    }

    $this->userRepository->delete($userId, $deletedBy);

    Logger::warning('user', 'Usuario eliminado', 'user.delete', [
      'user_id'    => $userId,
      'email'      => $existing['email'] ?? null,
      'deleted_by' => $deletedBy,
    ]);
  }

  /**
   * Changes a user's role. Admin-only operation; the actor cannot change their
   * own role (avoids self-lockout).
   *
   * @throws ApiException
   */
  public function changeRole(
    string $userId, string $role, string $actorId): void
  {
    if (empty($userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }
    if (trim($role) === '') {
      throw new ApiException(ErrorType::missingField('role'));
    }
    if (!AllowedUserRoles::isValid($role)) {
      throw new ApiException(ErrorType::invalidField('role'));
    }
    if ($userId === $actorId) {
      throw new ApiException(
        ErrorType::conflict('No puede cambiar su propio rol.')
      );
    }

    $existing = $this->userRepository->findById($userId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('USER_NOT_FOUND', 'El usuario no existe')
      );
    }

    $this->userRepository->updateRole($userId, $role);

    Logger::info('user', 'Rol de usuario modificado', 'user.change_role', [
      'user_id'  => $userId,
      'from'     => $existing['role'] ?? null,
      'to'       => $role,
      'actor_id' => $actorId,
    ]);
  }

  /**
   * Resurrects a logically deleted user profile.
   *
   * @throws ApiException
   */
  public function restoreUser(string $userId): void
  {
    if (empty($userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    $existing = $this->userRepository->findById($userId, 'all');
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('USER_NOT_FOUND', 'El usuario no existe')
      );
    }

    $isDeleted = (int)($existing['is_deleted'] ?? $existing['IS_DELETED'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(
        ErrorType::conflict('El usuario no se encuentra eliminado')
      );
    }

    $this->userRepository->restore($userId);

    Logger::info('user', 'Usuario restaurado', 'user.restore', [
      'user_id' => $userId,
      'email'   => $existing['email'] ?? null,
    ]);
  }
}