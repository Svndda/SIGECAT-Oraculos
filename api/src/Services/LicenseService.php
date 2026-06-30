<?php

declare(strict_types=1);

namespace Services;

use DateTimeImmutable;
use DTO\CreateLicenseDTO;
use DTO\UpdateLicenseDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\DeclarationsRepository;
use Repositories\LicenseRepository;

/**
 * LicenseService
 *
 * Business logic for declared licenses (LICENSE_TIMES). Licenses belong to a
 * declaration and to its owner, so writes (create/update/delete) are scoped to
 * the authenticated employee and only allowed while the declaration is still
 * 'Incomplete'. The referenced license type must exist and be active.
 *
 * @package Services
 */
class LicenseService
{
  private LicenseRepository $licenseRepository;
  private DeclarationsRepository $declarationRepository;

  /**
   * Constructs the LicenseService.
   *
   * @param PDO $pdo Active PDO database connection.
   */
  public function __construct(private PDO $pdo)
  {
    $this->licenseRepository = new LicenseRepository($this->pdo);
    $this->declarationRepository = new DeclarationsRepository($this->pdo);
  }

  /**
   * Creates a new license inside one of the user's own declarations, which must
   * still be 'Incomplete'.
   *
   * @return array<string, mixed>|null The newly created license data.
   * @throws ApiException
   */
  public function createLicense(string $userId, CreateLicenseDTO $dto): ?array
  {
    $dto->validate();

    $declaration = $this->declarationRepository->findById($dto->declarationId);
    if ($declaration === null) {
      throw new ApiException(ErrorType::notFound('Declaración'));
    }
    if ((string) $declaration['user_id'] !== $userId) {
      throw new ApiException(ErrorType::forbidden(), 403);
    }

    if (!$this->licenseRepository->licenseTypeExists($dto->licenseTypeId)) {
      throw new ApiException(ErrorType::notFound('Tipo de licencia'));
    }

    $this->assertIncomplete($dto->declarationId);

    $licenseTimeId = $this->licenseRepository->create($userId, $dto);

    Logger::info('license', 'Licencia declarada', 'license.create', [
      'license_time_id' => $licenseTimeId,
      'declaration_id'  => $dto->declarationId,
      'license_type_id' => $dto->licenseTypeId,
      'user_id'         => $userId,
    ]);

    return $this->getLicenseById($licenseTimeId);
  }

  /**
   * Applies a partial update to one of the user's own licenses, only while its
   * declaration is still 'Incomplete'.
   *
   * @return array<string, mixed>|null
   * @throws ApiException
   */
  public function updateLicense(string $userId, string $licenseTimeId, UpdateLicenseDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->requireOwnedLicense($userId, $licenseTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    if ($dto->licenseTypeId !== null && !$this->licenseRepository->licenseTypeExists($dto->licenseTypeId)) {
      throw new ApiException(ErrorType::notFound('Tipo de licencia'));
    }

    $startsAt = $dto->startsAtProvided ? (string) $dto->startsAt : (string) $existing['starts_at'];
    $endsAt   = $dto->endsAtProvided ? (string) $dto->endsAt : (string) $existing['ends_at'];

    $this->assertRange($startsAt, $endsAt);

    $this->licenseRepository->update($licenseTimeId, $dto);

    Logger::info('license', 'Licencia actualizada', 'license.update', [
      'license_time_id' => $licenseTimeId,
      'user_id'         => $userId,
    ]);

    return $this->getLicenseById($licenseTimeId);
  }

  /**
   * Deletes one of the user's own licenses, only while its declaration is still
   * 'Incomplete'.
   *
   * @throws ApiException
   */
  public function deleteLicense(string $userId, string $licenseTimeId): void
  {
    $existing = $this->requireOwnedLicense($userId, $licenseTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    if (!$this->licenseRepository->delete($licenseTimeId)) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar la licencia')
      );
    }

    Logger::info('license', 'Licencia eliminada', 'license.delete', [
      'license_time_id' => $licenseTimeId,
      'user_id'         => $userId,
    ]);
  }

  /**
   * Retrieves a paginated list of licenses. Admins may list any (optionally
   * filtered by declaration); other users are scoped to their own entries and
   * may only target their own declarations.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array{page: int, limit: int, total: int, total_pages: int}}
   * @throws ApiException
   */
  public function getAllLicenses(string $userId, bool $isAdmin, int $page = 1, int $limit = 10, string $filter = '', ?string $declarationId = null): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;
    $declarationId = ($declarationId !== null && trim($declarationId) !== '') ? $declarationId : null;

    // Non-admins can only ever see their own licenses.
    $userScope = $isAdmin ? null : $userId;

    if ($declarationId !== null && !$isAdmin) {
      $declaration = $this->declarationRepository->findById($declarationId);
      if ($declaration === null || (string) $declaration['user_id'] !== $userId) {
        throw new ApiException(ErrorType::forbidden(), 403);
      }
    }

    $total = $this->licenseRepository->countAll($filter, $declarationId, $userScope);
    $licenses = $this->licenseRepository->findAllPaginated($limit, $offset, $filter, $declarationId, $userScope);

    return [
      'data' => $licenses,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit),
      ],
    ];
  }

  /**
   * Retrieves a single license entry by its ID (admin use).
   *
   * @return array<string, mixed>|null License data.
   * @throws ApiException
   */
  public function getLicenseById(string $licenseTimeId): ?array
  {
    if (empty($licenseTimeId)) {
      throw new ApiException(ErrorType::missingField('license_time_id'));
    }

    $license = $this->licenseRepository->findById($licenseTimeId);

    if ($license === null) {
      throw new ApiException(
        ErrorType::from('LICENSE_NOT_FOUND', 'La licencia no existe')
      );
    }

    return $license;
  }

  /**
   * Loads a license entry asserting it exists and belongs to the user.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  private function requireOwnedLicense(string $userId, string $licenseTimeId): array
  {
    if (empty($licenseTimeId)) {
      throw new ApiException(ErrorType::missingField('license_time_id'));
    }

    $existing = $this->licenseRepository->findById($licenseTimeId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('LICENSE_NOT_FOUND', 'La licencia no existe')
      );
    }
    if ((string) ($existing['user_id'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::forbidden(), 403);
    }

    return $existing;
  }

  /** @throws ApiException when the declaration is not in 'Incomplete' state. */
  private function assertIncomplete(string $declarationId): void
  {
    if ($this->declarationRepository->getCurrentStatus($declarationId) !== 'Incomplete') {
      throw new ApiException(
        ErrorType::conflict(
          'Solo se pueden gestionar licencias mientras la declaración está incompleta'
        )
      );
    }
  }

  /**
   * Ensures the [starts_at, ends_at] range is ordered (mirrors CHECK_LICENSE_DATES).
   *
   * @throws ApiException
   */
  private function assertRange(string $startsAt, string $endsAt): void
  {
    $start = new DateTimeImmutable($startsAt);
    $end   = new DateTimeImmutable($endsAt);

    if ($end <= $start) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }
  }
}
