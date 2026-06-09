<?php

declare(strict_types=1);

namespace Services;

use DTO\CreateRestTimeDTO;
use DTO\UpdateRestTimeDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\RestTimeRepository;
use Repositories\UserRepository;

/**
 * RestTimeService
 *
 * Business logic for rest time entries. Coordinates validation, referential
 * checks against users and persistence through the repositories.
 *
 * @package Services
 */
class RestTimeService
{
  private RestTimeRepository $restTimeRepository;
  private UserRepository $userRepository;

  /**
   * Constructs the RestTimeService.
   *
   * @param PDO $pdo Active PDO database connection.
   */
  public function __construct(private PDO $pdo)
  {
    $this->restTimeRepository = new RestTimeRepository($this->pdo);
    $this->userRepository = new UserRepository($this->pdo);
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
   * Creates a new rest time entry.
   *
   * @param CreateRestTimeDTO $dto The data transfer object containing the entry info.
   * @return array<string, mixed>|null The newly created rest time data.
   * @throws ApiException
   */
  public function createRestTime(CreateRestTimeDTO $dto): ?array
  {
    $dto->validate();

    if ($this->userRepository->findById($dto->userId) === null) {
      throw new ApiException(
        ErrorType::from('USER_NOT_FOUND', 'El usuario especificado no existe')
      );
    }

    $restTimeId = $this->restTimeRepository->create($dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Applies a partial or full update to an existing rest time entry.
   *
   * @param string $restTimeId The ULID of the entry to update.
   * @param UpdateRestTimeDTO $dto The data transfer object containing updated info.
   * @return array<string, mixed>|null
   * @throws ApiException
   */
  public function updateRestTime(string $restTimeId, UpdateRestTimeDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->restTimeRepository->findById($restTimeId);

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    $this->restTimeRepository->update($restTimeId, $dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Soft-deletes a rest time entry.
   *
   * @param string $restTimeId The ULID of the entry to delete.
   * @param string $deletedBy The ULID of the user performing the deletion.
   * @return void
   * @throws ApiException
   */
  public function deleteRestTime(string $restTimeId, string $deletedBy): void
  {
    if (empty($restTimeId)) {
      throw new ApiException(ErrorType::missingField('rest_time_id'));
    }

    $existing = $this->restTimeRepository->findById($restTimeId);

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    $isDeleted = $this->restTimeRepository->delete($restTimeId, $deletedBy);

    if (!$isDeleted) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el registro de descanso')
      );
    }
  }

  /**
   * Restores a soft-deleted rest time entry.
   *
   * @param string $restTimeId The ULID of the entry to restore.
   * @return void
   * @throws ApiException
   */
  public function restoreRestTime(string $restTimeId): void
  {
    if (empty($restTimeId)) {
      throw new ApiException(ErrorType::missingField('rest_time_id'));
    }

    $existing = $this->restTimeRepository->findById($restTimeId, 'all');

    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    $isDeleted = (int) ($existing['is_deleted'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(
        ErrorType::conflict('El registro de descanso no está eliminado')
      );
    }

    $isRestored = $this->restTimeRepository->restore($restTimeId);

    if (!$isRestored) {
      throw new ApiException(
        ErrorType::from('RESTORE_FAILED', 'No se pudo restaurar el registro de descanso')
      );
    }
  }

  /**
   * Retrieves a paginated list of rest time entries.
   *
   * @param int $page The current page number.
   * @param int $limit The number of items per page.
   * @param string $filter Search filter for the rest type.
   * @param string $status Deletion status filter.
   * @return array{data: array<int, array<string, mixed>>, meta: array{page: int, limit: int, total: int, total_pages: int}}
   * @throws ApiException
   */
  public function getAllRestTimes(int $page = 1, int $limit = 10, string $filter = '', string $status = 'active'): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->restTimeRepository->countAll($filter, $status);
    $restTimes = $this->restTimeRepository->findAllPaginated(
      $limit, $offset, $filter, $status
    );

    return [
      'data' => $restTimes,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit),
      ],
    ];
  }

  /**
   * Retrieves a single rest time entry by its ID.
   *
   * @param string $restTimeId The ULID of the entry.
   * @param string $status One of active|deleted|all.
   * @return array<string, mixed>|null Rest time data.
   * @throws ApiException
   */
  public function getRestTimeById(string $restTimeId, string $status = 'active'): ?array
  {
    if (empty($restTimeId)) {
      throw new ApiException(ErrorType::missingField('rest_time_id'));
    }

    $status = $this->normalizeStatus($status);
    $restTime = $this->restTimeRepository->findById($restTimeId, $status);

    if ($restTime === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    return $restTime;
  }
}
