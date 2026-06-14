<?php
declare(strict_types=1);

namespace Controllers;

use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;
use Exception;
use Http\ApiException;
use Http\Request;
use Http\Response;
use Services\AuthService;
use Services\UserService;
use Http\ErrorType;
use PDO;

/**
 * UserController
 *
 * Handles HTTP layer for user-related operations (CRUD and profile).
 * Login operations have been delegated to AuthController.
 */
class UserController
{
  private AuthService $authService;
  private UserService $userService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->userService = new UserService($this->pdo);
  }

  /**
   * POST /users/register
   * Requires authentication — only an admin can register another.
   */
  public function register(): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $createdBy = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = RegisterUserDTO::fromArray($data);

      $this->userService->register($createdBy, $dto);

      Response::success(
        null, ['message' => 'Usuario registrado exitosamente'], 201
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    } catch (Exception $e) {
      Response::error($e->getMessage());
    }
  }

  /**
   * PATCH /users/me
   */
  public function update(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = UpdateUserDTO::fromArray($data);

      $this->userService->update($userId, $dto);

      Response::success(
        null, ['message' => 'Perfil actualizado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    } catch (Exception $e) {
      Response::error($e->getMessage());
    }
  }

  /**
   * PATCH /users/{id}/role
   * Changes a user's role. Admin only.
   */
  public function changeRole(string $userId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $role = (string) ($data['role'] ?? '');

      $this->userService->changeRole($userId, $role, (string) $auth['user_id']);

      Response::success(
        null, ['message' => 'Rol actualizado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /users/me/job-position
   * Assigns the plaza (by its "número de plaza") to the authenticated user.
   */
  public function assignJobPosition(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $jobPositionNumber = (string) ($data['job_position_number'] ?? '');

      $this->userService->assignJobPosition($userId, $jobPositionNumber);

      Response::success(
        null, ['message' => 'Número de plaza actualizado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /users/me/password
   * Changes the authenticated user's own password (verifies the current one).
   */
  public function changePassword(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $currentPassword = (string) ($data['current_password'] ?? '');
      $newPassword     = (string) ($data['new_password'] ?? '');

      $this->userService->changePassword($userId, $currentPassword, $newPassword);

      Response::success(
        null, ['message' => 'Contraseña actualizada exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /users/me
   */
  public function show(): void
  {
    try {
      $userInfo = $this->authService->requireAuth();
      $userId = $userInfo['user_id'] ?? null;

      if ($userId === null) {
        throw new ApiException(
          ErrorType::missingField('user_id'), 400
        );
      }

      $user = $this->userService->getById($userId);

      Response::success(
        $user, ['message' => 'Información de perfil obtenida exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /users/{id}
   */
  public function getById(string $userId): void
  {
    try {
      $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $user = $this->userService->getById($userId, $status);

      Response::success($user, ['message' => 'Usuario obtenido exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /users
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->userService->getAllUsers($page, $limit, $filter, $status);
      $metaWithMsg = array_merge(
        $result['meta'], ['message' => 'Usuarios obtenidos exitosamente']
      );

      Response::success($result['data'], $metaWithMsg);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /users/{id}
   */
  public function delete(string $userId): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $deletedBy = (string) $auth['user_id'];

      $this->userService->deleteUser($userId, $deletedBy);

      Response::success(
        null, ['message' => 'Usuario eliminado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /users/{id}/restore
   */
  public function restore(string $userId): void
  {
    try {
      $this->authService->requireAdmin();

      $this->userService->restoreUser($userId);

      Response::success(
        null,
        ['message' => 'Usuario restaurado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}