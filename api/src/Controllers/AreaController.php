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
 * - All area endpoints require admin via AuthService::requireAdmin().
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
   * Admin only.
   */
  public function show(string $areaId): void {
    try {
      $this->authService->requireAdmin();

      $status = trim((string) ($_GET['status'] ?? 'active'));

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
   * Admin only.
   */
  public function index(): void {
    try {
      $this->authService->requireAdmin();

      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $result = $this->areaService->getAreas($page, $limit, $filter, $status);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /areas/{id}
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
