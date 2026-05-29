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
   */
  public function create(): void {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto  = AreaRequestDTO::fromArray($data);

      $this->areaService->createArea($auth['USER_ID'], $dto);

      Response::success(null, null, 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /areas/{id}
   */
  public function show(string $areaId): void {
    try {
      $this->authService->requireAuth();

      $area = $this->areaService->getById($areaId);

      Response::success($area, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /areas
   * Query params: page (int), limit (int), filter (string)
   */
  public function index(): void {
    try {
      $this->authService->requireAuth();

      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->areaService->getAreas($page, $limit, $filter);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PUT /areas/{id}
   */
  public function update(string $areaId): void {
    try {
      $this->authService->requireAuth();

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
   */
  public function delete(string $areaId): void {
    try {
      $this->authService->requireAuth();

      $this->areaService->deleteArea($areaId);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
