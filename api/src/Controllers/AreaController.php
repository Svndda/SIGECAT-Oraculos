<?php
declare(strict_types=1);

namespace Controllers;

use DTO\AreaRequestDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AreaService;
use Services\AuthService;

/**
 * AreaController
 *
 * Handles HTTP layer for area-related operations.
 *
 * Responsibilities:
 * - Parses JSON body via Request::parseJsonRequest() or query params via $_GET.
 * - Delegates business logic to AreaService.
 * - Captures ApiException and returns formatted errors via Response::error().
 * - Requires authentication on all endpoints via AuthService::requireAuth().
 */
class AreaController {

  private AuthService $authService;
  private AreaService $areaService;

  public function __construct(private PDO $pdo) {
    $this->authService = new AuthService($this->pdo);
    $this->areaService = new AreaService($this->pdo);
  }

  /**
   * POST /areas
   * Admin only.
   */
  public function create(): void {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = AreaRequestDTO::fromArray($data);

      $this->areaService->createArea((string) $auth['user_id'], $dto);

      Response::success(null, null, 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /areas/{id}
   * Query params: status (active|deleted|all, default active)
   * Seeing deleted areas (status deleted|all) requires admin.
   */
  public function show(string $areaId): void {
    try {
      $status = trim((string) ($_GET['status'] ?? 'active'));
      $this->authorizeStatus($status);

      $area = $this->areaService->getById($areaId, $status);

      Response::success($area, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /areas
   * Query params: page (int), limit (int), filter (string),
   *               status (active|deleted|all, default active)
   * Seeing deleted areas (status deleted|all) requires admin.
   */
  public function index(): void {
    try {
      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $this->authorizeStatus($status);

      $result = $this->areaService->getAreas($page, $limit, $filter, $status);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Authorizes a read by status: any authenticated user may read active rows,
   * but only admins may include deleted rows (status deleted|all).
   */
  private function authorizeStatus(string $status): void {
    if ($status === '' || $status === 'active') {
      $this->authService->requireAuth();
    } else {
      $this->authService->requireAdmin();
    }
  }

  /**
   * PUT /areas/{id}
   * Admin only.
   */
  public function update(string $areaId): void {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = AreaRequestDTO::fromArray($data);

      $this->areaService->updateArea($areaId, $dto);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /areas/{id}
   * Soft-deletes the area and cascades to its children and plazas. Admin only.
   */
  public function delete(string $areaId): void {
    try {
      $auth = $this->authService->requireAdmin();

      $this->areaService->deleteArea($areaId, (string) $auth['user_id']);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /areas/{id}/restore
   * Restores a soft-deleted area. Admin only.
   */
  public function restore(string $areaId): void {
    try {
      $this->authService->requireAdmin();

      $this->areaService->restoreArea($areaId);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
