<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateCustomFunctionDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\CustomFunctionService;

/**
 * CustomFunctionController
 *
 * HTTP layer for employee custom functions (CUSTOM_FUNCTIONS). Every endpoint
 * requires an authenticated user and operates strictly on that user's own
 * functions. Only creation and reads are exposed (no update/delete).
 *
 * @package Controllers
 */
class CustomFunctionController
{
  private AuthService $authService;
  private CustomFunctionService $customFunctionService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->customFunctionService = new CustomFunctionService($this->pdo);
  }

  /**
   * POST /custom-functions
   * Authenticated user; the function is owned by the caller.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto  = CreateCustomFunctionDTO::fromArray($data);

      $created = $this->customFunctionService->createCustomFunction((string) $auth['user_id'], $dto);

      Response::success($created, ['message' => 'Función personalizada creada exitosamente'], 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /custom-functions
   * Admins list every user's custom functions (read-only view); other users
   * only their own. Query params: page, limit, filter.
   */
  public function index(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->customFunctionService->getCustomFunctions(
        $page, $limit, $filter, $isAdmin ? null : (string) $auth['user_id']
      );

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /custom-functions/{id}
   * Admins may view any custom function; other users only their own.
   */
  public function show(string $customFunctionId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $data = $this->customFunctionService->getCustomFunctionByIdForViewer(
        (string) $auth['user_id'], $isAdmin, $customFunctionId
      );

      Response::success($data, ['message' => 'Función personalizada obtenida exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
