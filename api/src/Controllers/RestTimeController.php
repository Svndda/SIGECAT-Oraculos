<?php

namespace Controllers;

use DTO\CreateRestTimeDTO;
use DTO\UpdateRestTimeDTO;
use Exception;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\RestTimeService;

/**
 * RestTimeController
 *
 * HTTP layer for managing rest time entries. Admin only.
 *
 * @package Controllers
 */
class RestTimeController
{
  private AuthService $authService;
  private RestTimeService $restTimeService;

  public function __construct(PDO $pdo)
  {
    $this->authService = new AuthService($pdo);
    $this->restTimeService = new RestTimeService($pdo);
  }

  /**
   * POST /rest-time
   * Creates a new rest time entry.
   * Requires Admin privileges.
   *
   * @return void
   */
  public function create(): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto = CreateRestTimeDTO::fromArray($data);

      $restTime = $this->restTimeService->createRestTime($dto);

      Response::success(
        $restTime,
        ['message' => 'Registro de descanso creado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    } catch (Exception $e) {
      Response::error($e->getMessage());
    }
  }

  /**
   * PATCH /rest-time/{id}
   * Updates an existing rest time entry.
   * Requires Admin privileges.
   *
   * @param string $restTimeId The ID of the rest time entry from the URL parameters.
   * @return void
   */
  public function update(string $restTimeId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto = UpdateRestTimeDTO::fromArray($data);

      $this->restTimeService->updateRestTime($restTimeId, $dto);

      Response::success(
        null, ['message' => 'Registro de descanso actualizado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    } catch (Exception $e) {
      Response::error($e->getMessage());
    }
  }

  /**
   * DELETE /rest-time/{id}
   * Soft-deletes a rest time entry.
   * Requires Admin privileges.
   *
   * @param string $restTimeId The ID of the rest time entry from the URL parameters.
   * @return void
   */
  public function delete(string $restTimeId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $this->restTimeService->deleteRestTime($restTimeId, (string) $auth['user_id']);

      Response::success(
        null, ['message' => 'Registro de descanso eliminado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /rest-time/{id}/restore
   * Restores a soft-deleted rest time entry.
   * Requires Admin privileges.
   *
   * @param string $restTimeId The ID of the rest time entry from the URL parameters.
   * @return void
   */
  public function restore(string $restTimeId): void
  {
    try {
      $this->authService->requireAdmin();

      $this->restTimeService->restoreRestTime($restTimeId);

      Response::success(
        null, ['message' => 'Registro de descanso restaurado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /rest-time
   * Returns a paginated list of rest time entries.
   * Query params: page (int), limit (int), filter (string), status (active|deleted|all)
   *
   * @return void
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $status = trim((string) ($_GET['status'] ?? 'active'));
      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->restTimeService->getAllRestTimes(
        $page, $limit, $filter, $status
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Registros de descanso obtenidos exitosamente']
      );

      Response::success($result['data'], $metaWithMsg);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /rest-time/{id}
   * Returns a specific rest time entry by its ID.
   * Query params: status (active|deleted|all)
   *
   * @param string $restTimeId The ID of the rest time entry from the URL parameters.
   * @return void
   */
  public function show(string $restTimeId): void
  {
    try {
      $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $restTime = $this->restTimeService->getRestTimeById($restTimeId, $status);

      Response::success(
        $restTime, ['message' => 'Registro de descanso obtenido exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
