<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateUnitDTO;
use DTO\UpdateUnitDTO;
use DTO\UnitResponseDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\UnitRepository;

/**
 * UnitService
 *
 * Orchestrates all business logic related to units.
 *
 * Responsibilities:
 * - Delegates structural validation to the Unit DTOs.
 * - Delegates persistence to UnitRepository.
 * - Enforces business rules (unique name among active units, existence,
 *   soft-delete and restore).
 * - Has no knowledge of HTTP transport.
 */
class UnitService {

  private UnitRepository $unitRepository;

  public function __construct(private PDO $pdo) {
    $this->unitRepository = new UnitRepository($this->pdo);
  }

  /**
   * Normalizes and validates the read status filter.
   *
   * @throws ApiException when the value is not one of active|deleted|all.
   */
  private function normalizeStatus(string $status): string {
    $normalized = $status === '' ? 'active' : strtolower($status);
    if (!in_array($normalized, ['active', 'deleted', 'all'], true)) {
      throw new ApiException(ErrorType::invalidField('status'));
    }
    return $normalized;
  }

  /**
   * Creates a new unit.
   *
   * Business rules:
   * - Unit name must be unique among active units (case-insensitive).
   *
   * @return array<string, mixed> The newly created unit.
   * @throws ApiException
   */
  public function createUnit(string $createdBy, CreateUnitDTO $dto): array {
    $dto->validate();

    if ($this->unitRepository->existsByName($dto->name)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una unidad registrada con ese nombre')
      );
    }

    $unitId = $this->unitRepository->createUnit($createdBy, $dto);

    Logger::info('unit', 'Unidad creada', 'unit.create', [
      'unit_id'    => $unitId,
      'name'       => $dto->name,
      'created_by' => $createdBy,
    ]);

    return $this->getUnitById($unitId);
  }

  /**
   * Applies a partial update to an existing (active) unit.
   *
   * Business rules:
   * - Unit must exist and be active.
   * - New name must be unique among active units, excluding the current one.
   *
   * @return array<string, mixed> The updated unit.
   * @throws ApiException
   */
  public function updateUnit(string $unitId, UpdateUnitDTO $dto): array {
    $dto->validate();

    if ($this->unitRepository->findById($unitId) === null) {
      throw new ApiException(ErrorType::notFound('Unidad'));
    }

    if ($dto->name !== null && $this->unitRepository->existsByName($dto->name, $unitId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una unidad registrada con ese nombre')
      );
    }

    $this->unitRepository->updateUnit($unitId, $dto);

    Logger::info('unit', 'Unidad actualizada', 'unit.update', [
      'unit_id' => $unitId,
      'name'    => $dto->name,
    ]);

    return $this->getUnitById($unitId);
  }

  /**
   * Soft-deletes an existing (active) unit. Plazas pointing to it are
   * de-referenced by the repository (see docs/soft-delete-design.md §7).
   *
   * @throws ApiException
   */
  public function deleteUnit(string $unitId, string $deletedBy): void {
    if (empty($unitId)) {
      throw new ApiException(ErrorType::missingField('unit_id'));
    }

    if ($this->unitRepository->findById($unitId) === null) {
      throw new ApiException(ErrorType::notFound('Unidad'));
    }

    $this->unitRepository->deleteUnit($unitId, $deletedBy);

    Logger::warning('unit', 'Unidad eliminada', 'unit.delete', [
      'unit_id'    => $unitId,
      'deleted_by' => $deletedBy,
    ]);
  }

  /**
   * Restores a soft-deleted unit.
   *
   * Business rules:
   * - Unit must exist and currently be deleted.
   * - No active unit may already use the same name.
   *
   * @throws ApiException
   */
  public function restoreUnit(string $unitId): void {
    if (empty($unitId)) {
      throw new ApiException(ErrorType::missingField('unit_id'));
    }

    $row = $this->unitRepository->findById($unitId, 'all');
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Unidad'));
    }

    $isDeleted = (int) ($row['is_deleted'] ?? $row['IS_DELETED'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(ErrorType::conflict('La unidad no está eliminada'));
    }

    $name = (string) ($row['name'] ?? $row['NAME'] ?? '');
    if ($this->unitRepository->existsByName($name, $unitId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una unidad activa con ese nombre; no se puede reactivar')
      );
    }

    $this->unitRepository->restoreUnit($unitId);

    Logger::info('unit', 'Unidad restaurada', 'unit.restore', [
      'unit_id' => $unitId,
    ]);
  }

  /**
   * Returns a paginated, optionally filtered list of units.
   *
   * @param string $status One of active|deleted|all (default active).
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getUnits(int $page, int $limit, string $filter = '', string $status = 'active'): array {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);

    $offset = ($page - 1) * $limit;
    $result = $this->unitRepository->getUnits($offset, $limit, $filter, $status);
    $total  = $result['total'];

    $data = array_map(
      static fn(array $row) => UnitResponseDTO::fromArray($row)->toArray(),
      $result['data']
    );

    return [
      'data' => $data,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit),
      ],
    ];
  }

  /**
   * Returns a single unit by its ID.
   *
   * @param string $status One of active|deleted|all (default active).
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getUnitById(string $unitId, string $status = 'active'): array {
    if (empty($unitId)) {
      throw new ApiException(ErrorType::missingField('unit_id'));
    }

    $status = $this->normalizeStatus($status);

    $row = $this->unitRepository->findById($unitId, $status);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Unidad'));
    }

    return UnitResponseDTO::fromArray($row)->toArray();
  }
}
