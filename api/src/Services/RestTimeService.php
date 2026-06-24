<?php

declare(strict_types=1);

namespace Services;

use DateTimeImmutable;
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
 * checks against users and declarations, and persistence through the
 * repositories.
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

    if (!$this->restTimeRepository->declarationExists($dto->declarationId)) {
      throw new ApiException(ErrorType::notFound('Declaración'));
    }

    $restTimeId = $this->restTimeRepository->create($dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Applies a partial update to an existing rest time entry. The effective
   * (post-merge) range and rest type are revalidated so the entry keeps a
   * coherent, within-limit duration.
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

    $restType = $dto->restType ?? (string) $existing['rest_type'];
    $startsAt = $dto->startsAtProvided ? (string) $dto->startsAt : (string) $existing['starts_at'];
    $endsAt   = $dto->endsAtProvided ? (string) $dto->endsAt : (string) $existing['ends_at'];

    $this->assertRange($restType, $startsAt, $endsAt);

    $this->restTimeRepository->update($restTimeId, $dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Deletes a rest time entry.
   *
   * @param string $restTimeId The ULID of the entry to delete.
   * @return void
   * @throws ApiException
   */
  public function deleteRestTime(string $restTimeId): void
  {
    if (empty($restTimeId)) {
      throw new ApiException(ErrorType::missingField('rest_time_id'));
    }

    if ($this->restTimeRepository->findById($restTimeId) === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    if (!$this->restTimeRepository->delete($restTimeId)) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el registro de descanso')
      );
    }
  }

  /**
   * Retrieves a paginated list of rest time entries.
   *
   * @param int $page The current page number.
   * @param int $limit The number of items per page.
   * @param string $filter Search filter for the rest type.
   * @param string|null $declarationId Optional declaration to scope the list.
   * @return array{data: array<int, array<string, mixed>>, meta: array{page: int, limit: int, total: int, total_pages: int}}
   */
  public function getAllRestTimes(int $page = 1, int $limit = 10, string $filter = '', ?string $declarationId = null): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;
    $declarationId = ($declarationId !== null && trim($declarationId) !== '') ? $declarationId : null;

    $total = $this->restTimeRepository->countAll($filter, $declarationId);
    $restTimes = $this->restTimeRepository->findAllPaginated($limit, $offset, $filter, $declarationId);

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
   * @return array<string, mixed>|null Rest time data.
   * @throws ApiException
   */
  public function getRestTimeById(string $restTimeId): ?array
  {
    if (empty($restTimeId)) {
      throw new ApiException(ErrorType::missingField('rest_time_id'));
    }

    $restTime = $this->restTimeRepository->findById($restTimeId);

    if ($restTime === null) {
      throw new ApiException(
        ErrorType::from('REST_TIME_NOT_FOUND', 'El registro de descanso no existe')
      );
    }

    return $restTime;
  }

  /**
   * Ensures the [starts_at, ends_at] range is ordered and within the maximum
   * duration allowed for the rest type (mirrors CHK_REST_TIMES_DURATION).
   *
   * @throws ApiException
   */
  private function assertRange(string $restType, string $startsAt, string $endsAt): void
  {
    $start = new DateTimeImmutable($startsAt);
    $end   = new DateTimeImmutable($endsAt);

    if ($end <= $start) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }

    $minutes = ($end->getTimestamp() - $start->getTimestamp()) / 60;
    $maxMinutes = CreateRestTimeDTO::maxMinutesFor($restType);
    if ($minutes > $maxMinutes) {
      throw new ApiException(
        ErrorType::invalidField(
          'ends_at',
          "La duración del descanso '{$restType}' no puede exceder los {$maxMinutes} minutos"
        )
      );
    }
  }
}
