<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateJobPositionDTO;
use DTO\JobPositionResponseDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\JobPositionRepository;

/**
 * JobPositionService
 *
 * Business logic for managing plazas (JOB_POSITIONS): creation, listing and
 * soft deletion. Has no knowledge of HTTP transport.
 *
 * @package Services
 */
class JobPositionService
{
  private JobPositionRepository $repository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new JobPositionRepository($this->pdo);
  }

  /** @throws ApiException when the status filter is invalid. */
  private function normalizeStatus(string $status): string
  {
    $normalized = $status === '' ? 'active' : strtolower($status);
    if (!in_array($normalized, ['active', 'deleted', 'all'], true)) {
      throw new ApiException(ErrorType::invalidField('status'));
    }
    return $normalized;
  }

  /**
   * Registers a new plaza. The plaza number (name) must be unique among
   * active plazas.
   *
   * @throws ApiException
   */
  public function createPlaza(string $createdBy, CreateJobPositionDTO $dto): void
  {
    $dto->validate();

    if ($this->repository->existsByName($dto->name)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una plaza registrada con ese número')
      );
    }

    $this->repository->createPlaza($createdBy, $dto);
  }

  /**
   * Returns a paginated, optionally filtered list of plazas.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getPlazas(int $page, int $limit, string $filter = '', string $status = 'active'): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->repository->countPlazas($filter, $status);
    $rows  = $this->repository->getPlazas($offset, $limit, $filter, $status);

    $data = array_map(
      static fn(array $row) => JobPositionResponseDTO::fromArray($row)->toArray(),
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
   * Soft-deletes an existing (active) plaza.
   *
   * @throws ApiException
   */
  public function deletePlaza(string $jobPositionId, string $deletedBy): void
  {
    if (trim($jobPositionId) === '') {
      throw new ApiException(ErrorType::missingField('job_position_id'));
    }

    if ($this->repository->findById($jobPositionId) === null) {
      throw new ApiException(ErrorType::notFound('Plaza'));
    }

    $this->repository->deletePlaza($jobPositionId, $deletedBy);
  }

  /**
   * Lists the available job position types (for selection when creating a plaza).
   *
   * @return array<int, array<string, mixed>>
   */
  public function listTypes(): array
  {
    return $this->repository->listTypes();
  }
}
