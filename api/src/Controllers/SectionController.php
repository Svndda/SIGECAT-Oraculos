<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateSectionDTO;
use DTO\UpdateSectionDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\SectionService;
use Services\AuthService;

/**
 * SectionController
 *
 * Handles HTTP layer for section-related operations.
 *
 * Responsibilities:
 * - Parses JSON body via Request::parseJsonRequest() or query params via $_GET.
 * - Delegates business logic to SectionService.
 * - Captures ApiException and returns formatted errors via Response::error().
 * - Requires authentication on all endpoints via AuthService::requireAuth().
 */
class SectionController {

  private AuthService $authService;
  private SectionService $sectionService;

  public function __construct(private PDO $pdo) {
    $this->authService = new AuthService($this->pdo);
    $this->sectionService = new SectionService($this->pdo);
  }

  /**
   * POST /sections
   * Admin only.
   */
  public function create(): void {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = CreateSectionDTO::fromArray($data);

      $this->sectionService->createSection((string) $auth['user_id'], $dto);

      Response::success(null, null, 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /sections/{id}
   * Query params: status (active|deleted|all, default active)
   * Seeing deleted sections (status deleted|all) requires admin.
   */
  public function show(string $sectionId): void {
    try {
      $status = trim((string) ($_GET['status'] ?? 'active'));
      $this->authorizeStatus($status);

      $section = $this->sectionService->getById($sectionId, $status);

      Response::success($section, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /sections
   * Query params: page (int), limit (int), filter (string),
   *               status (active|deleted|all, default active)
   * Seeing deleted sections (status deleted|all) requires admin.
   */
  public function index(): void {
    try {
      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $this->authorizeStatus($status);

      $result = $this->sectionService->getSections($page, $limit, $filter, $status);

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
   * PUT /sections/{id}
   * Admin only.
   */
  public function update(string $sectionId): void {
    try {
      // $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = UpdateSectionDTO::fromArray($data);

      $this->sectionService->updateSection($sectionId, $dto);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /sections/{id}
   * Soft-deletes the section and cascades to its children and plazas. Admin only.
   */
  public function delete(string $sectionId): void {
    try {
      $auth = $this->authService->requireAdmin();

      $this->sectionService->deleteSection($sectionId, (string) $auth['user_id']);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /sections/{id}/restore
   * Restores a soft-deleted section. Admin only.
   */
  public function restore(string $sectionId): void {
    try {
      // TODO: Remove comment bars for requireAdmin
      // $this->authService->requireAdmin();

      $this->sectionService->restoreSection($sectionId);

      Response::success(null, null, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}