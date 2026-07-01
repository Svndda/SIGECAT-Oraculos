<?php

namespace Controllers;

use DTO\CreateLicenseDTO;
use DTO\UpdateLicenseDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\LicenseService;

/**
 * LicenseController
 *
 * HTTP layer for managing declared licenses (LICENSE_TIMES).
 *
 * Auth model: create/update/delete are available to any authenticated user so
 * they can fill in their declaration, but always scoped to their own entries
 * (ownership is verified in the service). `show` is admin only. `index` is
 * ownership-aware: admins list anything, other users only their own.
 *
 * @package Controllers
 */
class LicenseController
{
  private AuthService $authService;
  private LicenseService $licenseService;

  public function __construct(PDO $pdo)
  {
    $this->authService = new AuthService($pdo);
    $this->licenseService = new LicenseService($pdo);
  }

  /**
   * POST /license
   * Creates a license entry in one of the caller's own declarations.
   * Any authenticated user.
   *
   * @return void
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto = CreateLicenseDTO::fromArray($data);

      $license = $this->licenseService->createLicense((string) $auth['user_id'], $dto);

      Response::success(
        $license,
        ['message' => 'Licencia creada exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /license/{id}
   * Updates one of the caller's own license entries. Any authenticated user.
   *
   * @param string $licenseTimeId The ID of the license entry from the URL parameters.
   * @return void
   */
  public function update(string $licenseTimeId): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $data = Request::parseJsonRequest();
      $dto = UpdateLicenseDTO::fromArray($data);

      $this->licenseService->updateLicense((string) $auth['user_id'], $licenseTimeId, $dto);

      Response::success(
        null, ['message' => 'Licencia actualizada exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /license/{id}
   * Deletes one of the caller's own license entries. Any authenticated user.
   *
   * @param string $licenseTimeId The ID of the license entry from the URL parameters.
   * @return void
   */
  public function delete(string $licenseTimeId): void
  {
    try {
      $auth = $this->authService->requireAuth();

      $this->licenseService->deleteLicense((string) $auth['user_id'], $licenseTimeId);

      Response::success(
        null, ['message' => 'Licencia eliminada exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /license
   * Returns a paginated list of license entries. Admins see all (optionally
   * filtered by declaration); other users only their own.
   * Query params: page (int), limit (int), filter (string), declaration_id (string)
   *
   * @return void
   */
  public function index(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $page          = max(1, (int) ($_GET['page']   ?? 1));
      $limit         = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter        = trim((string) ($_GET['filter'] ?? ''));
      $declarationId = trim((string) ($_GET['declaration_id'] ?? ''));

      $result = $this->licenseService->getAllLicenses(
        (string) $auth['user_id'], $isAdmin, $page, $limit, $filter, $declarationId
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Licencias obtenidas exitosamente']
      );

      Response::success($result['data'], $metaWithMsg);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /license/{id}
   * Returns a specific license entry by its ID. Admin only.
   *
   * @param string $licenseTimeId The ID of the license entry from the URL parameters.
   * @return void
   */
  public function show(string $licenseTimeId): void
  {
    try {
      $this->authService->requireAdmin();

      $license = $this->licenseService->getLicenseById($licenseTimeId);

      Response::success(
        $license, ['message' => 'Licencia obtenida exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
