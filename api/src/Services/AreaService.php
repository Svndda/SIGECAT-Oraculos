<?php
declare(strict_types=1);

namespace Services;

use DTO\AreaRequestDTO;
use DTO\AreaResponseDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\AreaRepository;

/**
 * AreaService
 *
 * Orchestrates all business logic related to areas.
 *
 * Responsibilities:
 * - Delegates structural validation to AreaRequestDTO.
 * - Delegates persistence to AreaRepository.
 * - Enforces business rules (unique name, area existence, soft-delete).
 * - Has no knowledge of HTTP transport.
 */
class AreaService {

  private AreaRepository $areaRepository;

  public function __construct(private PDO $pdo) {
    $this->areaRepository = new AreaRepository($this->pdo);
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
   * Registers a new area.
   *
   * Business rules:
   * - Area name must be unique among active areas (case-insensitive).
   *
   * @throws ApiException
   */
  public function createArea(string $createdBy, AreaRequestDTO $dto): void {
    $dto->validate();

    if ($this->areaRepository->existsByName($dto->name)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe un área registrada con ese nombre')
      );
    }

    $this->areaRepository->createArea($createdBy, $dto);

    Logger::info('area', 'Área creada', 'area.create', [
      'name'       => $dto->name,
      'created_by' => $createdBy,
    ]);
  }

  /**
   * Updates name and/or description of an existing (active) area.
   *
   * Business rules:
   * - Area must exist and be active.
   * - New name must be unique among active areas, excluding the current one.
   *
   * @throws ApiException
   */
  public function updateArea(string $areaId, AreaRequestDTO $dto): void {
    $dto->validate();

    if ($this->areaRepository->findById($areaId) === null) {
      throw new ApiException(ErrorType::notFound('Área'));
    }

    if ($this->areaRepository->existsByName($dto->name, $areaId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe un área registrada con ese nombre')
      );
    }

    $this->areaRepository->updateArea($areaId, $dto);

    Logger::info('area', 'Área actualizada', 'area.update', [
      'area_id' => $areaId,
      'name'    => $dto->name,
    ]);
  }

  /**
   * Returns a paginated and optionally filtered list of areas.
   *
   * @param string $status One of active|deleted|all (default active).
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getAreas(int $page, int $limit, string $filter = '', string $status = 'active'): array {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);

    $offset = ($page - 1) * $limit;
    $total  = $this->areaRepository->countAreas($filter, $status);
    $rows   = $this->areaRepository->getAreas($offset, $limit, $filter, $status);

    $data = array_map(
      static fn(array $row) => AreaResponseDTO::fromArray($row)->toArray(),
      $rows
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
   * Returns a single area by its ID.
   *
   * @param string $status One of active|deleted|all (default active). With
   *                       'active', a soft-deleted area returns 404.
   * @return array{area_id: string, name: string, description: string|null, created_at: string, created_by: string, is_deleted: int, deleted_at: string|null}
   * @throws ApiException
   */
  public function getById(string $areaId, string $status = 'active'): array {
    if (empty($areaId)) {
      throw new ApiException(ErrorType::missingField('area_id'));
    }

    $status = $this->normalizeStatus($status);

    $row = $this->areaRepository->findById($areaId, $status);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Área'));
    }

    return AreaResponseDTO::fromArray($row)->toArray();
  }

  /**
   * Soft-deletes an existing (active) area and cascades to its children
   * (departments, sections, units) and plazas. See docs/soft-delete-design.md §6.
   *
   * @throws ApiException
   */
  public function deleteArea(string $areaId, string $deletedBy): void {
    if (empty($areaId)) {
      throw new ApiException(ErrorType::missingField('area_id'));
    }

    if ($this->areaRepository->findById($areaId) === null) {
      throw new ApiException(ErrorType::notFound('Área'));
    }

    $this->areaRepository->deleteArea($areaId, $deletedBy);

    Logger::warning('area', 'Área eliminada', 'area.delete', [
      'area_id'    => $areaId,
      'deleted_by' => $deletedBy,
    ]);
  }

  /**
   * Restores a soft-deleted area.
   *
   * Business rules:
   * - Area must exist and currently be deleted.
   * - No active area may already use the same name (would break the partial
   *   unique index). Returns conflict if so.
   *
   * @throws ApiException
   */
  public function restoreArea(string $areaId): void {
    if (empty($areaId)) {
      throw new ApiException(ErrorType::missingField('area_id'));
    }

    $row = $this->areaRepository->findById($areaId, 'all');
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Área'));
    }

    $isDeleted = (int) ($row['is_deleted'] ?? $row['IS_DELETED'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(ErrorType::conflict('El área no está eliminada'));
    }

    $name = (string) ($row['name'] ?? $row['NAME'] ?? '');
    if ($this->areaRepository->existsByName($name, $areaId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe un área activa con ese nombre; no se puede reactivar')
      );
    }

    $this->areaRepository->restoreArea($areaId);

    Logger::info('area', 'Área restaurada', 'area.restore', [
      'area_id' => $areaId,
    ]);
  }
}
