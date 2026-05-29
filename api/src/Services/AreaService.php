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
 * - Enforces business rules (unique name, area existence).
 * - Has no knowledge of HTTP transport.
 */
class AreaService {

  private AreaRepository $areaRepository;

  public function __construct(private PDO $pdo) {
    $this->areaRepository = new AreaRepository($this->pdo);
  }

  /**
   * Registers a new area.
   *
   * Business rules:
   * - Area name must be unique (case-insensitive).
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
  }

  /**
   * Updates name and/or description of an existing area.
   *
   * Business rules:
   * - Area must exist.
   * - New name must be unique excluding the current area.
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
  }

  /**
   * Returns a paginated and optionally filtered list of areas.
   *
   * @return array{data: array<int, array<string, string>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getAreas(int $page, int $limit, string $filter = ''): array {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $offset = ($page - 1) * $limit;
    $total  = $this->areaRepository->countAreas($filter);
    $rows   = $this->areaRepository->getAreas($offset, $limit, $filter);

    $data = array_map(
      static fn(array $row) => AreaResponseDTO::fromArray($row)->toArray(),
      $rows
    );

    return [
      'data' => $data,
      'meta' => [
        'page'       => $page,
        'limit'      => $limit,
        'total'      => $total,
        'totalPages' => (int) ceil($total / $limit),
      ],
    ];
  }

  /**
   * Removes an existing area.
   *
   * Business rules:
   * - Area must exist before deletion.
   * - Area must have no child departments or sections.
   *
   * @throws ApiException
   */
  public function deleteArea(string $areaId): void {
    if (empty($areaId)) {
      throw new ApiException(ErrorType::missingField('area_id'));
    }

    if ($this->areaRepository->findById($areaId) === null) {
      throw new ApiException(ErrorType::notFound('Área'));
    }

    if ($this->areaRepository->hasChildEntities($areaId)) {
      throw new ApiException(
        ErrorType::conflict('No es posible eliminar el área porque tiene departamentos o secciones asociadas.')
      );
    }

    $this->areaRepository->deleteArea($areaId);
  }
}
