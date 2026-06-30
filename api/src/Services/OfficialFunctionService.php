<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateOfficialFunctionDTO;
use DTO\OfficialFunctionResponseDTO;
use DTO\UpdateOfficialFunctionDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\OfficialFunctionRepository;

/**
 * OfficialFunctionService
 *
 * Business logic for managing official functions (OFFICIAL_FUNCTIONS): listing,
 * creation, update and soft deletion. Has no knowledge of HTTP transport.
 *
 * Referential rules against declarations (through JOB_FUNCTIONS):
 *  - An official function can only be deleted while no declaration contains it.
 *  - Updating a function that is already contained in one or more declarations
 *    raises a warning the caller must acknowledge (confirm) before it applies.
 *
 * @package Services
 */
class OfficialFunctionService
{
  private OfficialFunctionRepository $repository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new OfficialFunctionRepository($this->pdo);
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
   * Registers a new official function. The name must be unique among active
   * functions of the same job, and the job must exist ("válido según
   * normativa").
   *
   * @throws ApiException
   */
  public function createOfficialFunction(string $createdBy, CreateOfficialFunctionDTO $dto): void
  {
    $dto->validate();

    if (!$this->repository->jobExists($dto->jobId)) {
      throw new ApiException(ErrorType::notFound('Puesto'));
    }

    if ($this->repository->existsByName($dto->name, $dto->jobId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una función registrada con ese nombre para este puesto')
      );
    }

    $this->repository->createOfficialFunction($createdBy, $dto);

    Logger::info('official_function', 'Función oficial creada', 'official_function.create', [
      'name'       => $dto->name,
      'job_id'     => $dto->jobId,
      'created_by' => $createdBy,
    ]);
  }

  /**
   * Applies a partial update to an existing (active) official function.
   *
   * If the function is already contained in one or more declarations, the
   * update is held back and a warning is returned unless $confirm is true; this
   * lets the client surface the notice ("hay N declaración(es) que contienen
   * esta función") before mutating shared data.
   *
   * @throws ApiException
   */
  public function updateOfficialFunction(string $officialFunctionId, UpdateOfficialFunctionDTO $dto, bool $confirm = false): void
  {
    if (trim($officialFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('official_function_id'));
    }

    $dto->validate();

    $current = $this->repository->findById($officialFunctionId);
    if ($current === null) {
      throw new ApiException(ErrorType::notFound('Función'));
    }

    if ($dto->jobId !== null && !$this->repository->jobExists($dto->jobId)) {
      throw new ApiException(ErrorType::notFound('Puesto'));
    }

    // Uniqueness is (name, job_id); revalidate when either changes against the
    // effective values after the update.
    $currentJobId = (string) ($current['job_id'] ?? $current['JOB_ID'] ?? '');
    $effectiveJobId = $dto->jobId ?? $currentJobId;
    $effectiveName = $dto->name ?? (string) ($current['name'] ?? $current['NAME'] ?? '');

    if (($dto->name !== null || $dto->jobId !== null)
      && $this->repository->existsByName($effectiveName, $effectiveJobId, $officialFunctionId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una función registrada con ese nombre para este puesto')
      );
    }

    $declarations = $this->repository->countDeclarationsContaining($officialFunctionId);
    if ($declarations > 0 && !$confirm) {
      throw new ApiException(
        ErrorType::from(
          'OFFICIAL_FUNCTION_IN_USE',
          "Hay {$declarations} declaración(es) que contienen esta función. "
            . 'Confirme la modificación para aplicarla de todas formas.'
        ),
        409
      );
    }

    $this->repository->updateOfficialFunction($officialFunctionId, $dto);

    Logger::info('official_function', 'Función oficial actualizada', 'official_function.update', [
      'official_function_id' => $officialFunctionId,
      'affected_declarations' => $declarations,
    ]);
  }

  /**
   * Soft-deletes an existing (active) official function, only when no
   * declaration contains it.
   *
   * @throws ApiException
   */
  public function deleteOfficialFunction(string $officialFunctionId, string $deletedBy): void
  {
    if (trim($officialFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('official_function_id'));
    }

    if ($this->repository->findById($officialFunctionId) === null) {
      throw new ApiException(ErrorType::notFound('Función'));
    }

    $declarations = $this->repository->countDeclarationsContaining($officialFunctionId);
    if ($declarations > 0) {
      throw new ApiException(
        ErrorType::conflict(
          "No se puede eliminar la función: hay {$declarations} declaración(es) que la contienen"
        )
      );
    }

    $this->repository->deleteOfficialFunction($officialFunctionId, $deletedBy);

    Logger::warning('official_function', 'Función oficial eliminada', 'official_function.delete', [
      'official_function_id' => $officialFunctionId,
      'deleted_by'           => $deletedBy,
    ]);
  }

  /**
   * Returns a paginated, optionally filtered list of official functions.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getOfficialFunctions(int $page, int $limit, string $filter = '', string $status = 'active', ?string $jobId = null): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;
    $jobId = ($jobId !== null && trim($jobId) !== '') ? $jobId : null;

    $total = $this->repository->countOfficialFunctions($filter, $status, $jobId);
    $rows  = $this->repository->getOfficialFunctions($offset, $limit, $filter, $status, $jobId);

    $data = array_map(
      static fn(array $row) => OfficialFunctionResponseDTO::fromArray($row)->toArray(),
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
   * Returns a single official function by id.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getOfficialFunctionById(string $officialFunctionId, string $status = 'active'): array
  {
    if (trim($officialFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('official_function_id'));
    }

    $status = $this->normalizeStatus($status);
    $row = $this->repository->findById($officialFunctionId, $status);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Función'));
    }

    return OfficialFunctionResponseDTO::fromArray($row)->toArray();
  }
}
