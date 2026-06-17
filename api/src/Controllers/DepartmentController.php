<?php

namespace Controllers;

use DTO\CreateDepartmentDTO;
use DTO\UpdateDepartmentDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\DepartmentService;

class DepartmentController {

  private AuthService $authService;
  private DepartmentService $departmentService;

  public function __construct(PDO $pdo)
  {
    $this->authService = new AuthService($pdo);
    $this->departmentService = new DepartmentService($pdo);
  }

  /**
   * POST /departments
   * Creates a new department.
   * Requires authentication.
   * * @return void
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $createdBy = (string) $auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = CreateDepartmentDTO::fromArray($data);

      $department = $this->departmentService->createDepartment($createdBy, $dto);

      Response::success(
        $department,
        ['message' => 'Departamento creado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * PATCH /departments/{id}
   * Updates an existing department.
   * Requires authentication.
   *
   * @param string $departmentId The ID of the department from the URL parameters.
   * @return void
   */
  public function update(string $departmentId): void
  {
    try {
      $this->authService->requireAdmin();

      $data = Request::parseJsonRequest();
      $dto = UpdateDepartmentDTO::fromArray($data);

      $this->departmentService->updateDepartment($departmentId, $dto);

      Response::success(
        null, ['message' => 'Departamento actualizado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * DELETE /departments/{id}
   * Soft-deletes a department.
   * Requires Admin privileges to prevent unauthorized deletions.
   *
   * @param string $departmentId The ID of the department from the URL parameters.
   * @return void
   */
  public function delete(string $departmentId): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $this->departmentService->deleteDepartment($departmentId, (string) $auth['user_id']);

      Response::success(
        null, ['message' => 'Departamento eliminado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /departments/{id}/restore
   * Restores a soft-deleted department.
   * Requires Admin privileges.
   *
   * @param string $departmentId The ID of the department from the URL parameters.
   * @return void
   */
  public function restore(string $departmentId): void
  {
    try {
      $this->authService->requireAdmin();

      $this->departmentService->restoreDepartment($departmentId);

      Response::success(
        null, ['message' => 'Departamento restaurado exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /departments
   * Returns a paginated list of departments.
   * Query params: page (int), limit (int), filter (string), status (active|deleted|all)
   *
   * @return void
   */
  public function index(): void
  {
    try {
      $auth = $this->authService->requireAdmin();

      $status = trim((string) ($_GET['status'] ?? 'active'));

      $page   = max(1, (int) ($_GET['page']   ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit']  ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->departmentService->getAllDepartments(
        $page, $limit, $filter, $status
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Departamentos obtenidos exitosamente']
      );

      Response::success(
        $result['data'],
        $metaWithMsg
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /departments/{id}
   * Returns a specific department by its ID.
   * Query params: status (active|deleted|all)
   *
   * @param string $departmentId The ID of the department from the URL parameters.
   * @return void
   */
  public function show(string $departmentId): void
  {
    try {
      $auth = $this->authService->requireAdmin();
      $status = trim((string) ($_GET['status'] ?? 'active'));

      $department = $this->departmentService->getDepartmentById($departmentId, $status);

      Response::success(
        $department, ['message' => 'Departamento obtenido exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}