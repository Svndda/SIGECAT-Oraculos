<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateUnitDTO;
use DTO\UpdateUnitDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\UnitService;

/**
 * UnitController
 *
 * Handles HTTP layer for unit-related operations.
 *
 * Responsibilities:
 * - Parses JSON body via Request::parseJsonRequest() or query params via $_GET.
 * - Delegates business logic to UnitService.
 * - Captures ApiException and returns formatted errors via Response::error().
 *
 * Authorization: any authenticated user may read active units; seeing deleted
 * units (status=deleted|all) and all writes (create/update/delete/restore)
 * require admin.
 */
class UnitController {

  private AuthService $authService;
  private UnitService $unitService;

  public function __construct(private PDO $pdo) {
    $this->authService = new AuthService($this->pdo);
    $this->unitService = new UnitService($this->pdo);
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
   * POST /units
   * Admin only.
   */
  public function create(): void {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = CreateUnitDTO::fromArray($data);

      $unit = $this->unitService->createUnit((string) $auth['user_id'], $dto);

      Response::success($unit, null, 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /units
   * Query params: page (int), limit (int), filter (string),
   *               status (active|deleted|all, default active)
   */
  public function index(): void {
    try {
      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $this->authorizeStatus($status);

      $result = $this->unitService->getUnits($page, $limit, $filter, $status);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /units/{id}
   * Query params: status (active|deleted|all, default active)
   * Seeing deleted units (status deleted|all) requires admin.
   */
  public function show(string $unitId): void {
    try {
      $status = trim((string) ($_GET['status'] ?? 'active'));
      $this->authorizeStatus($status);

      $unit = $this->unitService->getUnitById($unitId, $status);

      Response::success($unit, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /units/{id}
   * Admin only.
   */
  public function update(string $unitId): void {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = UpdateUnitDTO::fromArray($data);

      $unit = $this->unitService->updateUnit($unitId, $dto);

      Response::success($unit, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /units/{id}
   * Soft-deletes the unit and de-references its plazas. Admin only.
   */
  public function delete(string $unitId): void {
    try {
      $auth = $this->authService->requireAdmin();

      $this->unitService->deleteUnit($unitId, (string) $auth['user_id']);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /units/{id}/restore
   * Restores a soft-deleted unit. Admin only.
   */
  public function restore(string $unitId): void {
    try {
      $this->authService->requireAdmin();

      $this->unitService->restoreUnit($unitId);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
