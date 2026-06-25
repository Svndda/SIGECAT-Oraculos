<?php

declare(strict_types=1);

namespace Services;

use DateTimeImmutable;
use DTO\CreateRestTimeDTO;
use DTO\UpdateRestTimeDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\DeclarationRepository;
use Repositories\RestTimeRepository;

/**
 * RestTimeService
 *
 * Business logic for rest time entries. Rest times belong to a declaration and
 * to its owner, so writes (create/update/delete) are scoped to the
 * authenticated employee and only allowed while the declaration is still
 * 'Incomplete'.
 *
 * @package Services
 */
class RestTimeService
{
  private RestTimeRepository $restTimeRepository;
  private DeclarationRepository $declarationRepository;

  /**
   * Constructs the RestTimeService.
   *
   * @param PDO $pdo Active PDO database connection.
   */
  public function __construct(private PDO $pdo)
  {
    $this->restTimeRepository = new RestTimeRepository($this->pdo);
    $this->declarationRepository = new DeclarationRepository($this->pdo);
  }

  /**
   * Creates a new rest time entry inside one of the user's own declarations,
   * which must still be 'Incomplete'.
   *
   * @return array<string, mixed>|null The newly created rest time data.
   * @throws ApiException
   */
  public function createRestTime(string $userId, CreateRestTimeDTO $dto): ?array
  {
    $dto->validate();

    $declaration = $this->declarationRepository->findById($dto->declarationId);
    if ($declaration === null) {
      throw new ApiException(ErrorType::notFound('Declaración'));
    }
    if ((string) $declaration['user_id'] !== $userId) {
      throw new ApiException(ErrorType::forbidden(), 403);
    }

    $this->assertIncomplete($dto->declarationId);

    $restTimeId = $this->restTimeRepository->create($userId, $dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Applies a partial update to one of the user's own rest time entries, only
   * while its declaration is still 'Incomplete'.
   *
   * @return array<string, mixed>|null
   * @throws ApiException
   */
  public function updateRestTime(string $userId, string $restTimeId, UpdateRestTimeDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->requireOwnedRestTime($userId, $restTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    $restType = $dto->restType ?? (string) $existing['rest_type'];
    $startsAt = $dto->startsAtProvided ? (string) $dto->startsAt : (string) $existing['starts_at'];
    $endsAt   = $dto->endsAtProvided ? (string) $dto->endsAt : (string) $existing['ends_at'];

    $this->assertRange($restType, $startsAt, $endsAt);

    $this->restTimeRepository->update($restTimeId, $dto);

    return $this->getRestTimeById($restTimeId);
  }

  /**
   * Deletes one of the user's own rest time entries, only while its declaration
   * is still 'Incomplete'.
   *
   * @throws ApiException
   */
  public function deleteRestTime(string $userId, string $restTimeId): void
  {
    $existing = $this->requireOwnedRestTime($userId, $restTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    if (!$this->restTimeRepository->delete($restTimeId)) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el registro de descanso')
      );
    }
  }

  /**
   * Retrieves a paginated list of rest time entries. Admins may list any
   * (optionally filtered by declaration); other users are scoped to their own
   * entries and may only target their own declarations.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array{page: int, limit: int, total: int, total_pages: int}}
   * @throws ApiException
   */
  public function getAllRestTimes(string $userId, bool $isAdmin, int $page = 1, int $limit = 10, string $filter = '', ?string $declarationId = null): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;
    $declarationId = ($declarationId !== null && trim($declarationId) !== '') ? $declarationId : null;

    // Non-admins can only ever see their own rest times.
    $userScope = $isAdmin ? null : $userId;

    if ($declarationId !== null && !$isAdmin) {
      $declaration = $this->declarationRepository->findById($declarationId);
      if ($declaration === null || (string) $declaration['user_id'] !== $userId) {
        throw new ApiException(ErrorType::forbidden(), 403);
      }
    }

    $total = $this->restTimeRepository->countAll($filter, $declarationId, $userScope);
    $restTimes = $this->restTimeRepository->findAllPaginated($limit, $offset, $filter, $declarationId, $userScope);

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
   * Retrieves a single rest time entry by its ID (admin use).
   *
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
   * Loads a rest time entry asserting it exists and belongs to the user.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  private function requireOwnedRestTime(string $userId, string $restTimeId): array
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
    if ((string) ($existing['user_id'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::forbidden(), 403);
    }

    return $existing;
  }

  /** @throws ApiException when the declaration is not in 'Incomplete' state. */
  private function assertIncomplete(string $declarationId): void
  {
    if (!$this->declarationRepository->isIncomplete($declarationId)) {
      throw new ApiException(
        ErrorType::conflict(
          'Solo se pueden gestionar tiempos de descanso mientras la declaración está incompleta'
        )
      );
    }
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
