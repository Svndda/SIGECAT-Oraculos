<?php

declare(strict_types=1);

namespace Controllers;

use DTO\CreateJobDTO;
use DTO\UpdateJobDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\JobService;

/**
 * Class JobController
 *
 * Handles HTTP layer operations for managing job definitions (Puestos).
 * All endpoints within this controller require administrative authentication.
 *
 * @package Controllers
 */
class JobController
{
  private AuthService $authService;
  private JobService $jobService;

  /**
   * JobController constructor.
   *
   * @param PDO $pdo The active database connection instance.
   */
  public function __construct(PDO $pdo)
  {
    $this->authService = new AuthService($pdo);
    $this->jobService = new JobService($pdo);
  }

  /**
   * POST /job
   * Creates a new job definition in the catalog.
   * Requires administrative privileges.
   *
   * @throws ApiException If validation fails or a database constraint is violated.
   * @return void
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $createdBy = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = CreateJobDTO::fromArray($data);

      $job = $this->jobService->createJob($createdBy, $dto);

      Response::success(
        $job,
        ['message' => 'Puesto creado exitosamente'],
        201
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job
   * Lists and filters job definitions with pagination.
   * Requires administrative privileges.
   *
   * Query parameters:
   * - page (int): Page number to retrieve (default: 1).
   * - limit (int): Total records per page (default: 10, max: 100).
   * - filter (string): Text filter applied over names or specific codes.
   * - status (string): Logical state filter ('active'|'deleted'|'all', default: 'active').
   *
   * @throws ApiException If filtering parameters are out of range.
   * @return void
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $status = trim((string) ($_GET['status'] ?? 'active'));
      $page = max(1, (int) ($_GET['page'] ?? 1));
      $limit = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->jobService->getAllJobs(
        $page,
        $limit,
        $filter,
        $status
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Puestos obtenidos exitosamente']
      );

      Response::success(
        $result['data'],
        $metaWithMsg,
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /job/{id}
   * Retrieves the detailed information of a specific job definition by its ID.
   * Requires administrative privileges.
   *
   * Query parameters:
   * - status (string): Logical state filter ('active'|'deleted'|'all').
   *
   * @param string $jobId The unique identifier (ULID) of the job.
   * @throws ApiException If the resource does not exist or the ID is empty.
   * @return void
   */
  public function show(string $jobId): void
  {
    try {
      $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $job = $this->jobService->getJobById($jobId, $status);

      Response::success(
        $job,
        ['message' => 'Puesto obtenido exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /job/{id}
   * Performs a partial update on an existing job specification.
   * Requires administrative privileges.
   *
   * @param string $jobId The unique identifier (ULID) of the target job.
   * @throws ApiException If payload validation fails or the target job is deleted.
   * @return void
   */
  public function update(string $jobId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto = UpdateJobDTO::fromArray($data);

      $this->jobService->updateJob($jobId, $dto);

      Response::success(
        null,
        ['message' => 'Puesto actualizado exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /job/{id}
   * Safely applies a soft delete to a specific job definition.
   * Requires administrative privileges.
   *
   * @param string $jobId The unique identifier (ULID) of the job to remove.
   * @throws ApiException If the target resource does not exist.
   * @return void
   */
  public function delete(string $jobId): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $deletedBy = (string) $auth['user_id'];

      $this->jobService->deleteJob($jobId, $deletedBy);

      Response::success(
        null,
        ['message' => 'Puesto eliminado exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}