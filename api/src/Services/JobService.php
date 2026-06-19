<?php

declare(strict_types=1);

namespace Services;

use DTO\CreateJobDTO;
use DTO\UpdateJobDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use PDOException;
use Repositories\JobRepository;
use Repositories\JobClassRepository;

/**
 * Class JobService
 * * Orchestrates business logic and repository interactions for job.
 * * @package Services
 */
class JobService
{
  private JobRepository $jobRepository;
  private JobClassRepository $jobClassRepository;
  private PDO $pdo;

  /**
   * JobService constructor.
   *
   * @param PDO $pdo The active database connection instance.
   */
  public function __construct(PDO $pdo)
  {
    $this->pdo = $pdo;
    $this->jobRepository = new JobRepository($this->pdo);
    $this->jobClassRepository = new JobClassRepository($this->pdo);
  }

  /**
   * Validates and normalizes the logical status parameter.
   *
   * @param string $status The raw status input string.
   * * @throws ApiException If the status is not within the accepted values.
   * @return string The normalized status ('active', 'deleted', or 'all').
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
   * Orchestrates the creation of a new job.
   *
   * @param string       $createdBy The ULID of the user making the request.
   * @param CreateJobDTO $dto       The validated data transfer object.
   * * @throws ApiException If the job class is not found, a unique constraint is violated, or internal DB error occurs.
   * @return array<string, mixed>|null The data of the newly created job.
   */
  public function createJob(string $createdBy, CreateJobDTO $dto): ?array
  {
    $dto->validate();

    if (!$this->jobClassRepository->existsById($dto->jobClassId)) {
      throw new ApiException(
        ErrorType::from('CLASS_NOT_FOUND', 'La clase ocupacional especificada no existe')
      );
    }

    $jobId = $this->jobRepository->create($dto, $createdBy);
    return $this->getJobById($jobId);
  }

  /**
   * Orchestrates the update process for an existing job.
   *
   * @param string       $jobId The ULID of the job to update.
   * @param UpdateJobDTO $dto   The validated data transfer object.
   * * @throws ApiException If the job or class is not found, a unique constraint is violated, or internal DB error occurs.
   * @return array<string, mixed>|null The data of the updated job.
   */
  public function updateJob(string $jobId, UpdateJobDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->jobRepository->findById($jobId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('JOB_NOT_FOUND', 'El puesto no existe')
      );
    }

    if (
      $dto->jobClassId !== null
      && !$this->jobClassRepository->existsById($dto->jobClassId)
    ) {
      throw new ApiException(
        ErrorType::from(
          'CLASS_NOT_FOUND',
          'La clase ocupacional especificada no existe'
        )
      );
    }

    $this->jobRepository->update($jobId, $dto);
    return $this->getJobById($jobId);
  }

  /**
   * Orchestrates the logical deletion of a job.
   *
   * @param string $jobId     The ULID of the job to delete.
   * @param string $deletedBy The ULID of the user making the request.
   * * @throws ApiException If the job ID is missing, the job does not exist, or the deletion query fails.
   * @return void
   */
  public function deleteJob(string $jobId, string $deletedBy): void
  {
    if (empty($jobId)) {
      throw new ApiException(ErrorType::missingField('job_id'));
    }

    $existing = $this->jobRepository->findById($jobId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('JOB_NOT_FOUND', 'El puesto no existe')
      );
    }

    $isDeleted = $this->jobRepository->delete($jobId, $deletedBy);
    if (!$isDeleted) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar el puesto')
      );
    }
  }

  /**
   * Retrieves a paginated list of job with associated metadata.
   *
   * @param int    $page   The requested page number.
   * @param int    $limit  The number of items per page.
   * @param string $filter The search string to filter by job name.
   * @param string $status The logical deletion status filter.
   * * @throws ApiException If an internal database error occurs.
   * @return array{
   * data: array<int, array<string, mixed>>,
   * meta: array{page: int, limit: int, total: int, total_pages: int}
   * }
   */
  public function getAllJobs(
    int $page = 1,
    int $limit = 10,
    string $filter = '',
    string $status = 'active'
  ): array {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->jobRepository->countAll(
      $filter,
      $status
    );

    $jobs = $this->jobRepository->findAllPaginated(
      $limit,
      $offset,
      $filter,
      $status
    );

    return [
      'data' => $jobs,
      'meta' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => (int) ceil($total / $limit)
      ]
    ];
  }

  /**
   * Retrieves a single job by its ID.
   *
   * @param string $jobId  The ULID of the job.
   * @param string $status The logical deletion status filter.
   * * @throws ApiException If the job ID is missing, the job does not exist, or a database error occurs.
   * @return array<string, mixed>|null Associative array containing the job data.
   */
  public function getJobById(string $jobId, string $status = 'active'): ?array
  {
    if (empty($jobId)) {
      throw new ApiException(ErrorType::missingField('job_id'));
    }

    $status = $this->normalizeStatus($status);
    $job = $this->jobRepository->findById($jobId, $status);

    if ($job === null) {
      throw new ApiException(
        ErrorType::from('JOB_NOT_FOUND', 'El puesto no existe')
      );
    }

    return $job;
  }
}