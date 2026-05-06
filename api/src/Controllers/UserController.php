<?php
declare(strict_types=1);

namespace Controllers;

use DTO\LoginUserDTO;
use DTO\RegisterUserDTO;
use DTO\UpdateUserDTO;
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
 * Handles HTTP layer for user-related operations.
 *
 * Responsibilities:
 * - Parses the JSON request body via Request::parseJsonRequest().
 * - Delegates business logic to UserService.
 * - Captures ApiException and returns formatted errors via Response::error().
 * - Obtains authenticated user context via AuthService::requireAuth().
 */
class UserController {

  private AuthService $authService;
  private UserService $userService;
  
  public function __construct(private PDO $pdo) {
    $this->authService = new AuthService($this->pdo);
    $this->userService = new UserService($this->pdo);
  }

  /**
   * POST /users/login
   */
  public function login(): void {
    try {
      $data = Request::parseJsonRequest();
      $dto  = LoginUserDTO::fromArray($data);

      $result = $this->userService->login($dto);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /users
   * Requires authentication — only an authenticated user can register another.
   */
  public function register(): void {
    try {
      // $auth      = $this->authService->requireAuth();

      // $createdBy = $auth['user_id'];

      $createdBy = 'SYSTEM_FIRST_USER________';

      $data = Request::parseJsonRequest();
      $dto  = RegisterUserDTO::fromArray($data);

      $this->userService->register($createdBy, $dto);

      Response::success(null, null, 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PUT /users
   * Updates the authenticated user's own profile.
   */
  public function update(): void
  {
    try {
      $auth   = $this->authService->requireAuth();
      $userId = $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto  = UpdateUserDTO::fromArray($data);

      $this->userService->update($userId, $dto);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /users/{id}
   * Returns public profile of a user by ID.
   */
  public function getById(string $userId): void
  {
    try {
      $this->authService->requireAuth();

      $user = $this->userService->getById($userId);

      Response::success($user, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}