<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateLicenseTypeDTO;
use DTO\LicenseTypeResponseDTO;
use DTO\UpdateLicenseTypeDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\LicenseTypeRepository;

/**
 * LicenseTypeService
 *
 * Business logic for the license types catalogue (LICENSE_TYPES): listing,
 * creation, update and soft deletion. Has no knowledge of HTTP transport.
 *
 * Referential rule: a license type can only be deleted while no declared
 * license (LICENSE_TIMES) references it.
 *
 * @package Services
 */
class LicenseTypeService
{
  private LicenseTypeRepository $repository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new LicenseTypeRepository($this->pdo);
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
   * Registers a new license type. The name must be unique among active types.
   *
   * @throws ApiException
   */
  public function createLicenseType(string $createdBy, CreateLicenseTypeDTO $dto): void
  {
    $dto->validate();

    if ($this->repository->existsByName($dto->name)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe un tipo de licencia registrado con ese nombre')
      );
    }

    $this->repository->createLicenseType($createdBy, $dto);
  }

  /**
   * Applies a partial update to an existing (active) license type.
   *
   * @throws ApiException
   */
  public function updateLicenseType(string $licenseTypeId, UpdateLicenseTypeDTO $dto): void
  {
    if (trim($licenseTypeId) === '') {
      throw new ApiException(ErrorType::missingField('license_type_id'));
    }

    $dto->validate();

    if ($this->repository->findById($licenseTypeId) === null) {
      throw new ApiException(ErrorType::notFound('Tipo de licencia'));
    }

    if ($dto->name !== null && $this->repository->existsByName($dto->name, $licenseTypeId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe un tipo de licencia registrado con ese nombre')
      );
    }

    $this->repository->updateLicenseType($licenseTypeId, $dto);
  }

  /**
   * Soft-deletes an existing (active) license type, only when no declared
   * license references it.
   *
   * @throws ApiException
   */
  public function deleteLicenseType(string $licenseTypeId, string $deletedBy): void
  {
    if (trim($licenseTypeId) === '') {
      throw new ApiException(ErrorType::missingField('license_type_id'));
    }

    if ($this->repository->findById($licenseTypeId) === null) {
      throw new ApiException(ErrorType::notFound('Tipo de licencia'));
    }

    $inUse = $this->repository->countLicenseTimesUsing($licenseTypeId);
    if ($inUse > 0) {
      throw new ApiException(
        ErrorType::conflict(
          "No se puede eliminar el tipo de licencia: hay {$inUse} licencia(s) declarada(s) que lo utilizan"
        )
      );
    }

    $this->repository->deleteLicenseType($licenseTypeId, $deletedBy);
  }

  /**
   * Returns a paginated, optionally filtered list of license types.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getLicenseTypes(int $page, int $limit, string $filter = '', string $status = 'active'): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->repository->countLicenseTypes($filter, $status);
    $rows  = $this->repository->getLicenseTypes($offset, $limit, $filter, $status);

    $data = array_map(
      static fn(array $row) => LicenseTypeResponseDTO::fromArray($row)->toArray(),
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
   * Returns a single license type by id.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getLicenseTypeById(string $licenseTypeId, string $status = 'active'): array
  {
    if (trim($licenseTypeId) === '') {
      throw new ApiException(ErrorType::missingField('license_type_id'));
    }

    $status = $this->normalizeStatus($status);
    $row = $this->repository->findById($licenseTypeId, $status);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Tipo de licencia'));
    }

    return LicenseTypeResponseDTO::fromArray($row)->toArray();
  }
}
