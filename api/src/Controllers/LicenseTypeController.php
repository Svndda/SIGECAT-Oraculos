<?php
declare(strict_types=1);

namespace Controllers;

use DTO\CreateLicenseTypeDTO;
use DTO\UpdateLicenseTypeDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\LicenseTypeService;

/**
 * LicenseTypeController
 *
 * HTTP layer for the license types catalogue (LICENSE_TYPES). Reads
 * (index/show) are available to any authenticated user so employees can browse
 * the catalogue while filling a declaration; writes (create/update/delete)
 * require admin.
 *
 * @package Controllers
 */
class LicenseTypeController
{
  private AuthService $authService;
  private LicenseTypeService $licenseTypeService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->licenseTypeService = new LicenseTypeService($this->pdo);
  }

  /**
   * POST /license-type
   * Admin only.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = CreateLicenseTypeDTO::fromArray($data);

      $this->licenseTypeService->createLicenseType((string) $auth['user_id'], $dto);

      Response::success(null, ['message' => 'Tipo de licencia creado exitosamente'], 201);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /license-type/{id}
   * Admin only.
   */
  public function update(string $licenseTypeId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto  = UpdateLicenseTypeDTO::fromArray($data);

      $this->licenseTypeService->updateLicenseType($licenseTypeId, $dto);

      Response::success(null, ['message' => 'Tipo de licencia actualizado exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /license-type/{id}
   * Admin only.
   */
  public function delete(string $licenseTypeId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $this->licenseTypeService->deleteLicenseType($licenseTypeId, (string) $auth['user_id']);

      Response::success(null, ['message' => 'Tipo de licencia eliminado exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /license-type
   * Query params: page, limit, filter, status. Any authenticated user
   * (employees always get the active catalogue; only admins may filter status).
   */
  public function index(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));
      $status = $isAdmin ? trim((string) ($_GET['status'] ?? 'active')) : 'active';

      $result = $this->licenseTypeService->getLicenseTypes($page, $limit, $filter, $status);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /license-type/{id}
   * Query params: status. Any authenticated user (employees only see active).
   */
  public function show(string $licenseTypeId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $status = $isAdmin ? trim((string) ($_GET['status'] ?? 'active')) : 'active';
      $data = $this->licenseTypeService->getLicenseTypeById($licenseTypeId, $status);

      Response::success($data, ['message' => 'Tipo de licencia obtenido exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
