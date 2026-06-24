<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateJobFunctionDTO;
use DTO\UpdateJobFunctionDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\JobFunctionService;

/**
 * JobFunctionController
 *
 * HTTP layer for the functions declared on a declaration (JOB_FUNCTIONS). Every
 * endpoint requires an authenticated user and operates strictly on that user's
 * own declarations, only while the declaration is 'Incomplete'.
 *
 * @package Controllers
 */
class JobFunctionController
{
  private AuthService $authService;
  private JobFunctionService $jobFunctionService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->jobFunctionService = new JobFunctionService($this->pdo);
  }

  /**
   * POST /job-functions
   * Authenticated user; adds a function to one of the caller's declarations.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto  = CreateJobFunctionDTO::fromArray($data);

      $created = $this->jobFunctionService->createJobFunction((string) $auth['user_id'], $dto);

      Response::success($created, ['message' => 'Función agregada a la declaración exitosamente'], 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job-functions
   * Lists the caller's declaration functions. Query params: page, limit,
   * declaration_id (optional).
   */
  public function index(): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $page          = max(1, (int) ($_GET['page'] ?? 1));
      $limit         = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $declarationId = trim((string) ($_GET['declaration_id'] ?? ''));

      $result = $this->jobFunctionService->getJobFunctions((string) $auth['user_id'], $page, $limit, $declarationId);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job-functions/{id}
   * Returns one of the caller's declaration functions.
   */
  public function show(string $jobFunctionId): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = $this->jobFunctionService->getJobFunctionById((string) $auth['user_id'], $jobFunctionId);

      Response::success($data, ['message' => 'Función de la declaración obtenida exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /job-functions/{id}
   * Updates one of the caller's declaration functions.
   */
  public function update(string $jobFunctionId): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto  = UpdateJobFunctionDTO::fromArray($data);

      $this->jobFunctionService->updateJobFunction((string) $auth['user_id'], $jobFunctionId, $dto);

      Response::success(null, ['message' => 'Función de la declaración actualizada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /job-functions/{id}
   * Removes one of the caller's declaration functions.
   */
  public function delete(string $jobFunctionId): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $this->jobFunctionService->deleteJobFunction((string) $auth['user_id'], $jobFunctionId);

      Response::success(null, ['message' => 'Función de la declaración eliminada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
