<?php

namespace Services;

use DTO\CreateDepartmentDTO;
use DTO\UpdateDepartmentDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\AreaRepository;
use Repositories\DepartmentRepository;

class DepartmentService {

  private AreaRepository $areaRepository;
  private DepartmentRepository $departmentRepository;

  /**
   * Constructs the DepartmentService.
   *
   * @param PDO $pdo Active PDO database connection.
   */
  public function __construct(private PDO $pdo)
  {
    $this->areaRepository = new AreaRepository($this->pdo);
    $this->departmentRepository = new DepartmentRepository($this->pdo);
  }

  /**
   * Normalizes and validates the read status filter.
   *
   * @param string $status The raw status string.
   * @return string Normalized status.
   * @throws ApiException when the value is not one of active|deleted|all.
   */
  private function normalizeStatus(string $status): string
  {
    $normalized = $status === '' ? 'active' : strtolower($status);
    if (!in_array($normalized, ['active', 'deleted', 'all'], true)) {
      throw new ApiException(ErrorType::invalidField('status'));
    }
    return $normalized;
  }

  /**
   * Creates a new department.
   *
   * @param string $createdBy The ULID of the user creating the department.
   * @param CreateDepartmentDTO $dto The data transfer object containing department info.
   * @return array<string, mixed>|null The newly created department data.
   */
  public function createDepartment(
    string $createdBy,
    CreateDepartmentDTO $dto
  ) : ?array
  {
    $dto->validate();
    $areaId = $dto->areaId;

    if ($this->areaRepository->findById($areaId) === null) {
      throw new ApiException(
        ErrorType::from('AREA_NOT_FOUND', 'El área especificada no existe')
      );
    }

    $departmentId = $this->departmentRepository->create($dto, $createdBy);

    Logger::info('department', 'Departamento creado', 'department.create', [
      'department_id' => $departmentId,
      'area_id'       => $areaId,
      'created_by'    => $createdBy,
    ]);

    return $this->getDepartmentById($departmentId);
  }

  /**
   * Applies a partial or full update to an existing department.
   *
   * @param string $departmentId The ULID of the department to update.
   * @param UpdateDepartmentDTO $dto The data transfer object containing updated info.
   * @return array<string, mixed>|null
   */
  public function updateDepartment(
    string $departmentId, UpdateDepartmentDTO $dto
  ) : ?array
  {
    $dto->validate();

    $existing = $this->departmentRepository->findById($departmentId);

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('DEPARTMENT_NOT_FOUND', 'El departamento no existe')
      );
    }

    $areaId = $dto->areaId;
    if ($areaId !== null && $this->areaRepository->findById($areaId) === null) {
      throw new ApiException(
        ErrorType::from('AREA_NOT_FOUND', 'El área especificada no existe')
      );
    }

    $this->departmentRepository->update($departmentId,$dto);

    Logger::info('department', 'Departamento actualizado', 'department.update', [
      'department_id' => $departmentId,
    ]);

    return $this->getDepartmentById($departmentId);
  }

  /**
   * Soft-deletes a department.
   *
   * @param string $departmentId The ULID of the department to delete.
   * @param string $deletedBy The ULID of the user performing the deletion.
   * @return void
   * @throws ApiException
   */
  public function deleteDepartment(string $departmentId, string $deletedBy) : void
  {
    if (empty($departmentId)) {
      throw new ApiException(ErrorType::missingField('department_id'));
    }

    $existing = $this->departmentRepository->findById($departmentId);

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('DEPARTMENT_NOT_FOUND', 'El departamento no existe')
      );
    }

    $isDeleted = $this->departmentRepository->delete($departmentId, $deletedBy);

    if (!$isDeleted) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el departamento')
      );
    }

    Logger::warning('department', 'Departamento eliminado', 'department.delete', [
      'department_id' => $departmentId,
      'deleted_by'    => $deletedBy,
    ]);
  }

  /**
   * Restores a soft-deleted department.
   *
   * @param string $departmentId The ULID of the department to restore.
   * @return void
   * @throws ApiException
   */
  public function restoreDepartment(string $departmentId) : void
  {
    if (empty($departmentId)) {
      throw new ApiException(ErrorType::missingField('department_id'));
    }

    $existing = $this->departmentRepository->findById($departmentId, 'all');

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('DEPARTMENT_NOT_FOUND', 'El departamento no existe')
      );
    }

    $isDeleted = (int) ($existing['is_deleted'] ?? $existing['IS_DELETED'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(
        ErrorType::conflict('El departamento no está eliminado')
      );
    }

    $isRestored = $this->departmentRepository->restore($departmentId);

    if (!$isRestored) {
      throw new ApiException(
        ErrorType::from('RESTORE_FAILED', 'No se pudo restaurar el departamento')
      );
    }

    Logger::info('department', 'Departamento restaurado', 'department.restore', [
      'department_id' => $departmentId,
    ]);
  }

  /**
   * Retrieves a paginated list of registered departments.
   *
   * @param int $page The current page number.
   * @param int $limit The number of items per page.
   * @param string $filter Search filter for the department name.
   * @param string $status Deletion status filter.
   * @return array{data: array<int, array<string, mixed>>, meta: array{page: int, limit: int, total: int, total_pages: int}}
   */
  public function getAllDepartments(int $page = 1, int $limit = 10, string $filter = '', string $status = 'active'): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $result = $this->departmentRepository->findAllPaginated(
      $limit, $offset, $filter, $status
    );
    $total = $result['total'];

    return [
      'data' => $result['data'],
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit)
      ]
    ];
  }

  /**
   * Retrieves a single department by its ID.
   *
   * @param string $departmentId The ULID of the department.
   * @param string $status One of active|deleted|all.
   * @return array<string, mixed>|null Department data.
   */
  public function getDepartmentById(string $departmentId, string $status = 'active') : ?array
  {
    if (empty($departmentId)) {
      throw new ApiException(ErrorType::missingField('department_id'));
    }

    $status = $this->normalizeStatus($status);
    $department = $this->departmentRepository->findById($departmentId, $status);

    if ($department === null) {
      throw new ApiException(
        ErrorType::from('DEPARTMENT_NOT_FOUND', 'El departamento no existe')
      );
    }

    return $department;
  }
}