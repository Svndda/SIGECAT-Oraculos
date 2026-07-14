<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateJobFunctionDTO;
use DTO\JobFunctionResponseDTO;
use DTO\UpdateJobFunctionDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\CustomFunctionRepository;
use Repositories\DeclarationsRepository;
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
 *  - overtime_minutes is a manual entry ("¿Es tiempo extra?" + how many
 *    minutes) rather than derived from the declaration's shift window; when
 *    it is set a justification is mandatory (mirrors CHK_JOB_FUNC_OVER_JUST).
 *
 * @package Services
 */
class JobFunctionService
{
  private JobFunctionRepository $repository;
  private OfficialFunctionRepository $officialRepository;
  private CustomFunctionRepository $customRepository;
  private DeclarationsRepository $declarationRepository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new JobFunctionRepository($this->pdo);
    $this->officialRepository = new OfficialFunctionRepository($this->pdo);
    $this->customRepository = new CustomFunctionRepository($this->pdo);
    $this->declarationRepository = new DeclarationsRepository($this->pdo);
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

    $this->assertJustificationForOvertime($dto->overtimeMinutes, $dto->justification);

    $id = $this->repository->create([
      'user_id'              => $userId,
      'job_position_id'      => (string) $declaration['job_position_id'],
      'declaration_id'       => $dto->declarationId,
      'official_function_id' => $dto->officialFunctionId,
      'custom_function_id'   => $dto->customFunctionId,
      'overtime_minutes'     => $dto->overtimeMinutes,
      'justification'        => $dto->justification,
      'frequency'            => $dto->frequency,
      'duration_minutes'     => $dto->durationMinutes,
    ]);

    Logger::info('job_function', 'Función agregada a declaración', 'job_function.create', [
      'job_function_id' => $id,
      'declaration_id'  => $dto->declarationId,
      'user_id'         => $userId,
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

    $this->requireIncompleteOwnedDeclaration($userId, (string) $existing['declaration_id']);

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
    $durationMinutes = $dto->durationMinutes ?? (int) $existing['duration_minutes'];

    $existingOvertimeMinutes = $existing['overtime_minutes'] ?? $existing['OVERTIME_MINUTES'] ?? null;
    $overtimeMinutes = $dto->overtimeMinutes ?? ($existingOvertimeMinutes !== null ? (int) $existingOvertimeMinutes : null);

    $justification = $dto->justificationProvided
      ? $dto->justification
      : ((string) ($existing['justification'] ?? '') ?: null);

    $this->assertJustificationForOvertime($overtimeMinutes, $justification);

    $this->repository->update($jobFunctionId, [
      'official_function_id' => $official,
      'custom_function_id'   => $custom,
      'overtime_minutes'     => $overtimeMinutes,
      'justification'        => $justification,
      'frequency'            => $frequency,
      'duration_minutes'     => $durationMinutes,
    ]);

    Logger::info('job_function', 'Función de declaración actualizada', 'job_function.update', [
      'job_function_id' => $jobFunctionId,
      'declaration_id'  => (string) $existing['declaration_id'],
      'user_id'         => $userId,
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

    Logger::info('job_function', 'Función eliminada de declaración', 'job_function.delete', [
      'job_function_id' => $jobFunctionId,
      'declaration_id'  => (string) $existing['declaration_id'],
      'user_id'         => $userId,
    ]);
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
      $declaration = $this->declarationRepository->findById($declarationId);
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
   * @return array<string, mixed> The declaration row.
   * @throws ApiException
   */
  private function requireIncompleteOwnedDeclaration(string $userId, string $declarationId): array
  {
    $declaration = $this->declarationRepository->findById($declarationId);
    if ($declaration === null || (string) $declaration['user_id'] !== $userId) {
      throw new ApiException(ErrorType::notFound('Declaración'));
    }

    if ($this->declarationRepository->getCurrentStatus($declarationId) !== 'Incomplete') {
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

  /**
   * Mirrors CHK_JOB_FUNC_OVER_JUST: whenever overtime_minutes is set, a
   * justification is mandatory.
   *
   * @throws ApiException when overtime is reported without a justification.
   */
  private function assertJustificationForOvertime(?int $overtimeMinutes, ?string $justification): void
  {
    if ($overtimeMinutes !== null && $overtimeMinutes > 0 && ($justification === null || trim($justification) === '')) {
      throw new ApiException(
        ErrorType::missingField('justification')
      );
    }
  }
}