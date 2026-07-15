<?php

declare(strict_types=1);

namespace Services;

use DTO\CreateRestTimeDTO;
use DTO\UpdateRestTimeDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\DeclarationsRepository;
use Repositories\RestTimeRepository;

class RestTimeService
{
  private RestTimeRepository $restTimeRepository;
  private DeclarationsRepository $declarationRepository;

  public function __construct(private PDO $pdo)
  {
    $this->restTimeRepository = new RestTimeRepository($this->pdo);
    $this->declarationRepository = new DeclarationsRepository($this->pdo);
  }

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

    Logger::info('rest_time', 'Tiempo de descanso declarado', 'rest_time.create', [
      'rest_time_id'   => $restTimeId,
      'declaration_id' => $dto->declarationId,
      'user_id'        => $userId,
    ]);

    return $this->getRestTimeById($restTimeId);
  }

  public function updateRestTime(string $userId, string $restTimeId, UpdateRestTimeDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->requireOwnedRestTime($userId, $restTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    $restType = $dto->restType ?? (string) $existing['rest_type'];

    $rawDuration = $dto->durationMinutes;
    $durationMinutes = $rawDuration !== null && is_numeric($rawDuration)
      ? (int) $rawDurationx
      : (int) $existing['duration_minutes'];

    $this->assertDuration($restType, $durationMinutes);

    $this->restTimeRepository->update($restTimeId, $dto);

    Logger::info('rest_time', 'Tiempo de descanso actualizado', 'rest_time.update', [
      'rest_time_id' => $restTimeId,
      'user_id'      => $userId,
    ]);

    return $this->getRestTimeById($restTimeId);
  }

  public function deleteRestTime(string $userId, string $restTimeId): void
  {
    $existing = $this->requireOwnedRestTime($userId, $restTimeId);

    $this->assertIncomplete((string) $existing['declaration_id']);

    if (!$this->restTimeRepository->delete($restTimeId)) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el registro de descanso')
      );
    }

    Logger::info('rest_time', 'Tiempo de descanso eliminado', 'rest_time.delete', [
      'rest_time_id' => $restTimeId,
      'user_id'      => $userId,
    ]);
  }

  public function getAllRestTimes(string $userId, bool $isAdmin, int $page = 1, int $limit = 10, string $filter = '', ?string $declarationId = null): array
  {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;
    $declarationId = ($declarationId !== null && trim($declarationId) !== '') ? $declarationId : null;

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

  private function assertIncomplete(string $declarationId): void
  {
    if ($this->declarationRepository->getCurrentStatus($declarationId) !== 'Incomplete') {
      throw new ApiException(
        ErrorType::conflict(
          'Solo se pueden gestionar tiempos de descanso mientras la declaración está incompleta'
        )
      );
    }
  }

  private function assertDuration(string $restType, int $durationMinutes): void
  {
    $maxMinutes = CreateRestTimeDTO::maxMinutesFor($restType);
    if ($durationMinutes > $maxMinutes) {
      throw new ApiException(
        ErrorType::invalidField(
          'duration_minutes',
          "La duración del descanso '{$restType}' no puede exceder los {$maxMinutes} minutos"
        )
      );
    }
  }
}