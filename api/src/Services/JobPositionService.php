<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateJobPositionDTO;
use DTO\JobPositionResponseDTO;
use DTO\UpdateJobPositionDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\JobClassRepository;
use Repositories\JobPositionRepository;
use Repositories\JobRepository;

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
  private JobRepository $jobRepository;
  private JobClassRepository $jobClassRepository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new JobPositionRepository($this->pdo);
    $this->jobRepository = new JobRepository($this->pdo);
    $this->jobClassRepository = new JobClassRepository($this->pdo);
  }

  /**
   * Registers a new plaza. The plaza number must be unique among
   * active plazas.
   *
   * @throws ApiException
   */
  public function createJobPosition(
    string $createdBy,
    CreateJobPositionDTO $dto
  ): void {
    $dto->validate();

    if ($createdBy === $dto->userId) {
      throw new ApiException(
        ErrorType::from('FORBIDDEN', 'No puedes autoasignarte una plaza.'),
        403
      );
    }

    if ($this->repository->existsByNumber($dto->jobPositionNumber)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una plaza registrada con ese número')
      );
    }

    $this->repository->createJobPosition($createdBy, $dto);
  }

  /**
   * Applies a partial update to an existing (active) plaza. The plaza number
   * (name), when provided, must stay unique among active plazas.
   *
   * @throws ApiException
   */
  public function updateJobPosition(
    string $jobPositionId,
    UpdateJobPositionDTO $dto,
    string $actionByUserId
  ): void {
    if (trim($jobPositionId) === '') {
      throw new ApiException(ErrorType::missingField('job_position_id'));
    }

    $dto->validate();

    if ($dto->userId !== null && $actionByUserId === $dto->userId) {
      throw new ApiException(
        ErrorType::from('FORBIDDEN', 'No puedes autoasignarte una plaza.'),
        403
      );
    }

    if ($this->repository->findById($jobPositionId) === null) {
      throw new ApiException(ErrorType::notFound('Plaza'));
    }

    if (
      $dto->jobPositionNumber !== null
      && $this->repository->existsByNumber(
        $dto->jobPositionNumber,
        $jobPositionId
      )
    ) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una plaza registrada con ese número')
      );
    }

    $this->repository->updateJobPosition($jobPositionId, $dto);
  }

  /**
   * Returns a paginated, optionally filtered list of plazas.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getJobPositions(
    int $page,
    int $limit,
    string $filter = '',
    string $status = 'active'
  ): array {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->repository->countJobPositions($filter, $status);
    $data = $this->repository->getJobPositions(
      $offset,
      $limit,
      $filter,
      $status
    );

    return [
      'data' => $data,
      'meta' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => (int)ceil($total / $limit),
      ],
    ];
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
   * Retrieves all job positions assigned to a specific user, including related
   * job and job class information.
   *
   * @param string $userId
   * @return array<int, array<string, mixed>>
   * @throws ApiException
   */
  public function getByUser(string $userId): array
  {
    if (trim($userId) === '') {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    $jobPositions = $this->repository->getByUserId($userId);

    foreach ($jobPositions as &$position) {
      $position['job'] = null;
      $position['job_class'] = null;

      if (!empty($position['job_id'])) {
        $job = $this->jobRepository->findById($position['job_id']);

        if ($job !== null) {
          $position['job'] = $job;

          if (!empty($job['job_class_id'])) {
            $jobClass = $this->jobClassRepository->findById(
              $job['job_class_id']
            );
            if ($jobClass !== null) {
              $position['job_class'] = $jobClass;
            }
          }
        }
      }
    }

    return $jobPositions;
  }

  /**
   * Soft-deletes an existing (active) plaza.
   *
   * @throws ApiException
   */
  public function deleteJobPosition(
    string $jobPositionId,
    string $deletedBy
  ): void {
    if (trim($jobPositionId) === '') {
      throw new ApiException(ErrorType::missingField('job_position_id'));
    }

    if ($this->repository->findById($jobPositionId) === null) {
      throw new ApiException(ErrorType::notFound('Plaza'));
    }

    $this->repository->deleteJobPosition($jobPositionId, $deletedBy);
  }
}