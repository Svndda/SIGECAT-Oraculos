<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateJobPositionDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\JobPositionService;

/**
 * JobPositionController
 *
 * HTTP layer for plaza (JOB_POSITIONS) management. All endpoints require admin.
 *
 * @package Controllers
 */
class JobPositionController
{
  private AuthService $authService;
  private JobPositionService $jobPositionService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->jobPositionService = new JobPositionService($this->pdo);
  }

  /**
   * POST /plazas
   * Admin only.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = CreateJobPositionDTO::fromArray($data);

      $this->jobPositionService->createPlaza((string) $auth['user_id'], $dto);

      Response::success(null, ['message' => 'Plaza creada exitosamente'], 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /plazas
   * Query params: page, limit, filter, status. Admin only.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $result = $this->jobPositionService->getPlazas($page, $limit, $filter, $status);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /plazas/{id}
   * Admin only.
   */
  public function delete(string $jobPositionId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $this->jobPositionService->deletePlaza($jobPositionId, (string) $auth['user_id']);

      Response::success(null, ['message' => 'Plaza eliminada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job-position-types
   * Lists the available plaza types for selection. Admin only.
   */
  public function types(): void
  {
    try {
      $this->authService->requireAdmin();

      $types = $this->jobPositionService->listTypes();

      Response::success($types, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
