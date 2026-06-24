<?php
declare(strict_types=1);

namespace Services;

use DateTimeImmutable;
use DTO\CreateJobFunctionDTO;
use DTO\JobFunctionResponseDTO;
use DTO\UpdateJobFunctionDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\CustomFunctionRepository;
use Repositories\JobFunctionRepository;
use Repositories\OfficialFunctionRepository;

/**
 * JobFunctionService
 *
 * Business logic for the functions declared on a declaration (JOB_FUNCTIONS).
 * Everything is scoped to the authenticated employee: a user only manages the
 * functions of their own declarations, and only while the declaration is still
 * 'Incomplete'.
 *
 * Domain rules:
 *  - Exactly one of official/custom function is referenced (XOR).
 *  - overtime is derived as the portion of the function range that falls
 *    outside the declaration shift window; when there is overtime a
 *    justification is mandatory (mirrors CHK_JOB_FUNC_OVER_JUST).
 *
 * @package Services
 */
class JobFunctionService
{
  private JobFunctionRepository $repository;
  private OfficialFunctionRepository $officialRepository;
  private CustomFunctionRepository $customRepository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new JobFunctionRepository($this->pdo);
    $this->officialRepository = new OfficialFunctionRepository($this->pdo);
    $this->customRepository = new CustomFunctionRepository($this->pdo);
  }

  /**
   * Adds a function to a declaration owned by the user.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function createJobFunction(string $userId, CreateJobFunctionDTO $dto): array
  {
    $dto->validate();

    $declaration = $this->requireIncompleteOwnedDeclaration($userId, $dto->declarationId);

    $this->assertReferencedFunctionExists($userId, $dto->officialFunctionId, $dto->customFunctionId);

    $overtime = $this->overtimeHours(
      (string) $declaration['shift_starts_at'],
      (string) $declaration['shift_ends_at'],
      (string) $dto->startsAt,
      (string) $dto->endsAt
    );

    $justification = $dto->justification;
    $this->assertJustificationForOvertime($overtime, $justification);

    $id = $this->repository->create([
      'user_id'              => $userId,
      'job_position_id'      => (string) $declaration['job_position_id'],
      'declaration_id'       => $dto->declarationId,
      'official_function_id' => $dto->officialFunctionId,
      'custom_function_id'   => $dto->customFunctionId,
      'overtime'             => $overtime > 0 ? $overtime : null,
      'justification'        => $justification,
      'frequency'            => $dto->frequency,
      'starts_at'            => $dto->startsAt,
      'ends_at'              => $dto->endsAt,
    ]);

    return $this->getJobFunctionById($userId, $id);
  }

  /**
   * Applies a partial update to one of the user's declaration functions.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function updateJobFunction(string $userId, string $jobFunctionId, UpdateJobFunctionDTO $dto): array
  {
    $dto->validate();

    $existing = $this->repository->findById($jobFunctionId);
    if ($existing === null || (string) ($existing['user_id'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::notFound('Función de la declaración'));
    }

    $declaration = $this->requireIncompleteOwnedDeclaration($userId, (string) $existing['declaration_id']);

    // Resolve the effective function reference (XOR is preserved).
    $official = (string) ($existing['official_function_id'] ?? '') ?: null;
    $custom   = (string) ($existing['custom_function_id'] ?? '') ?: null;
    if ($dto->officialFunctionId !== null) {
      $official = $dto->officialFunctionId;
      $custom = null;
    } elseif ($dto->customFunctionId !== null) {
      $custom = $dto->customFunctionId;
      $official = null;
    }
    $this->assertReferencedFunctionExists($userId, $official, $custom);

    $frequency = $dto->frequency ?? (string) $existing['frequency'];
    $startsAt  = $dto->startsAtProvided ? (string) $dto->startsAt : (string) $existing['starts_at'];
    $endsAt    = $dto->endsAtProvided ? (string) $dto->endsAt : (string) $existing['ends_at'];

    if ($endsAt <= $startsAt) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }

    $overtime = $this->overtimeHours(
      (string) $declaration['shift_starts_at'],
      (string) $declaration['shift_ends_at'],
      $startsAt,
      $endsAt
    );

    $justification = $dto->justificationProvided
      ? $dto->justification
      : ((string) ($existing['justification'] ?? '') ?: null);

    $this->assertJustificationForOvertime($overtime, $justification);

    $this->repository->update($jobFunctionId, [
      'official_function_id' => $official,
      'custom_function_id'   => $custom,
      'overtime'             => $overtime > 0 ? $overtime : null,
      'justification'        => $justification,
      'frequency'            => $frequency,
      'starts_at'            => $startsAt,
      'ends_at'              => $endsAt,
    ]);

    return $this->getJobFunctionById($userId, $jobFunctionId);
  }

  /**
   * Removes one of the user's declaration functions, only while the declaration
   * is still 'Incomplete'.
   *
   * @throws ApiException
   */
  public function deleteJobFunction(string $userId, string $jobFunctionId): void
  {
    $existing = $this->repository->findById($jobFunctionId);
    if ($existing === null || (string) ($existing['user_id'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::notFound('Función de la declaración'));
    }

    $this->requireIncompleteOwnedDeclaration($userId, (string) $existing['declaration_id']);

    if (!$this->repository->delete($jobFunctionId)) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar la función de la declaración')
      );
    }
  }

  /**
   * Returns one of the user's declaration functions.
   *
   * @return array<string, mixed>
   * @throws ApiException
   */
  public function getJobFunctionById(string $userId, string $jobFunctionId): array
  {
    if (trim($jobFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('job_function_id'));
    }

    $row = $this->repository->findById($jobFunctionId);
    if ($row === null || (string) ($row['user_id'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::notFound('Función de la declaración'));
    }

    return JobFunctionResponseDTO::fromArray($row)->toArray();
  }

  /**
   * Lists the user's declaration functions, optionally scoped to one of their
   * declarations.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getJobFunctions(string $userId, int $page, int $limit, ?string $declarationId = null): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $offset = ($page - 1) * $limit;
    $declarationId = ($declarationId !== null && trim($declarationId) !== '') ? $declarationId : null;

    if ($declarationId !== null) {
      // Only the owner of the declaration may list its functions.
      $declaration = $this->repository->getDeclaration($declarationId);
      if ($declaration === null || (string) $declaration['user_id'] !== $userId) {
        throw new ApiException(ErrorType::notFound('Declaración'));
      }
      $total = $this->repository->countByDeclaration($declarationId);
      $rows  = $this->repository->getByDeclaration($declarationId, $offset, $limit);
    } else {
      $total = $this->repository->countByUser($userId);
      $rows  = $this->repository->getByUser($userId, $offset, $limit);
    }

    $data = array_map(
      static fn(array $row) => JobFunctionResponseDTO::fromArray($row)->toArray(),
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
   * Loads a declaration, asserting it exists, is owned by the user and is still
   * 'Incomplete' (the only state in which its functions can be edited).
   *
   * @return array<string, mixed> The declaration row (with its shift window).
   * @throws ApiException
   */
  private function requireIncompleteOwnedDeclaration(string $userId, string $declarationId): array
  {
    $declaration = $this->repository->getDeclaration($declarationId);
    if ($declaration === null || (string) $declaration['user_id'] !== $userId) {
      throw new ApiException(ErrorType::notFound('Declaración'));
    }

    $status = $this->repository->getDeclarationStatus($declarationId);
    if ($status !== 'Incomplete') {
      throw new ApiException(
        ErrorType::conflict(
          'Solo se pueden gestionar funciones mientras la declaración está incompleta'
        )
      );
    }

    return $declaration;
  }

  /**
   * Ensures the referenced function exists: an official function must be active,
   * and a custom function must belong to the user.
   *
   * @throws ApiException
   */
  private function assertReferencedFunctionExists(string $userId, ?string $officialFunctionId, ?string $customFunctionId): void
  {
    if ($officialFunctionId !== null) {
      if ($this->officialRepository->findById($officialFunctionId, 'active') === null) {
        throw new ApiException(ErrorType::notFound('Función oficial'));
      }
    }

    if ($customFunctionId !== null) {
      $custom = $this->customRepository->findById($customFunctionId);
      if ($custom === null || (string) ($custom['user_id'] ?? $custom['USER_ID'] ?? '') !== $userId) {
        throw new ApiException(ErrorType::notFound('Función personalizada'));
      }
    }
  }

  /** @throws ApiException when there is overtime but no justification. */
  private function assertJustificationForOvertime(float $overtime, ?string $justification): void
  {
    if ($overtime > 0 && ($justification === null || trim($justification) === '')) {
      throw new ApiException(
        ErrorType::missingField('justification')
      );
    }
  }

  /**
   * Portion of [start, end] falling outside the shift window [shiftStart,
   * shiftEnd], expressed in hours rounded to 2 decimals.
   */
  private function overtimeHours(string $shiftStart, string $shiftEnd, string $start, string $end): float
  {
    $s  = (new DateTimeImmutable($start))->getTimestamp();
    $e  = (new DateTimeImmutable($end))->getTimestamp();
    $ss = (new DateTimeImmutable($shiftStart))->getTimestamp();
    $se = (new DateTimeImmutable($shiftEnd))->getTimestamp();

    $before = max(0, min($e, $ss) - $s);   // part before the shift starts
    $after  = max(0, $e - max($s, $se));   // part after the shift ends
    $seconds = $before + $after;

    return round($seconds / 3600, 2);
  }
}
