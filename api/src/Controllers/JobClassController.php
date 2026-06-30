<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateJobClassDTO;
use DTO\UpdateJobClassDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\JobClassService;

/**
 * JobClassController
 *
 * HTTP layer for reading occupational classes (listing only). Admin only.
 *
 * @package Controllers
 */
class JobClassController
{
  private AuthService $authService;
  private JobClassService $jobClassService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->jobClassService = new JobClassService($this->pdo);
  }

  /**
   * GET /job-class
   * Query params: page, limit, filter. Admin only.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->jobClassService->getJobClasses($page, $limit, $filter);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /job-class
   * Creates a new job class definition in the catalog.
   * Requires administrative privileges.
   *
   * @throws ApiException If validation fails.
   * @return void
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $createdBy = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = CreateJobClassDTO::fromArray($data);

      $job = $this->jobClassService->createJobClass($createdBy, $dto);

      Response::success(
        $job,
        ['message' => 'Clase ocupacional creada exitosamente'],
        201
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job-class/{id}
   * Retrieves the detailed information of a specific job class definition by its ID.
   * Requires administrative privileges.
   *
   * Query parameters:
   * - status (string): Logical state filter ('active'|'deleted'|'all').
   *
   * @param string $jobClassId The unique identifier (ULID) of the job class.
   * @throws ApiException If the resource does not exist or the ID is empty.
   * @return void
   */
  public function show(string $jobClassId): void
  {
    try {
      $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $jobClass = $this->jobClassService->getJobClassById($jobClassId, $status);

      Response::success(
        $jobClass,
        ['message' => 'Clase ocupacional obtenida exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /job-class/{id}
   * Performs a partial update on an existing job class specification.
   * Requires administrative privileges.
   *
   * @param string $jobClassId The unique identifier (ULID) of the target job.
   * @throws ApiException If payload validation fails or the target job class is deleted.
   * @return void
   */
  public function update(string $jobClassId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto = UpdateJobClassDTO::fromArray($data);

      $this->jobClassService->updateJobClass($jobClassId, $dto);

      Response::success(
        null,
        ['message' => 'Clase ocupacional actualizada exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /job-class/{id}
   * Safely applies a soft delete to a specific job definition.
   * Requires administrative privileges.
   *
   * @param string $jobClassId The unique identifier (ULID) of the job to remove.
   * @throws ApiException If the target resource does not exist.
   * @return void
   */
  public function delete(string $jobClassId): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $deletedBy = (string) $auth['user_id'];

      $this->jobClassService->deleteJobClass($jobClassId, $deletedBy);

      Response::success(
        null,
        ['message' => 'Clase ocupacional eliminada exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
