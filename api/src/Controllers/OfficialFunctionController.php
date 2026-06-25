<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateOfficialFunctionDTO;
use DTO\UpdateOfficialFunctionDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\OfficialFunctionService;

/**
 * OfficialFunctionController
 *
 * HTTP layer for the official functions catalogue (OFFICIAL_FUNCTIONS). Each
 * official function belongs to a JOB ("tipo de puesto"). All endpoints require
 * admin.
 *
 * @package Controllers
 */
class OfficialFunctionController
{
  private AuthService $authService;
  private OfficialFunctionService $officialFunctionService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->officialFunctionService = new OfficialFunctionService($this->pdo);
  }

  /**
   * POST /official-functions
   * Admin only.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = CreateOfficialFunctionDTO::fromArray($data);

      $this->officialFunctionService->createOfficialFunction((string) $auth['user_id'], $dto);

      Response::success(null, ['message' => 'Función creada exitosamente'], 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /official-functions/{id}
   * Admin only. Pass confirm=true (body or query) to apply an update on a
   * function already contained in declarations.
   */
  public function update(string $officialFunctionId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = UpdateOfficialFunctionDTO::fromArray($data);

      $confirm = filter_var($data['confirm'] ?? $_GET['confirm'] ?? false, FILTER_VALIDATE_BOOLEAN);

      $this->officialFunctionService->updateOfficialFunction($officialFunctionId, $dto, $confirm);

      Response::success(null, ['message' => 'Función actualizada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /official-functions/{id}
   * Admin only.
   */
  public function delete(string $officialFunctionId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $this->officialFunctionService->deleteOfficialFunction($officialFunctionId, (string) $auth['user_id']);

      Response::success(null, ['message' => 'Función eliminada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /official-functions
   * Query params: page, limit, filter, status, job_id. Admin only.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));
      $jobId  = trim((string) ($_GET['job_id'] ?? ''));

      $result = $this->officialFunctionService->getOfficialFunctions($page, $limit, $filter, $status, $jobId);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /official-functions/{id}
   * Query params: status. Admin only.
   */
  public function show(string $officialFunctionId): void
  {
    try {
      $this->authService->requireAdmin();

      $status = trim((string) ($_GET['status'] ?? 'active'));
      $data = $this->officialFunctionService->getOfficialFunctionById($officialFunctionId, $status);

      Response::success($data, ['message' => 'Función obtenida exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
