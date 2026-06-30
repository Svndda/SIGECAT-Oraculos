<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateJobClassDTO;
use DTO\UpdateJobClassDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\JobClassRepository;

/**
 * JobClassService
 *
 * Read-side business logic for occupational classes (listing for selection).
 *
 * @package Services
 */
class JobClassService
{
  private JobClassRepository $repository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new JobClassRepository($this->pdo);
  }

  /**
   * Returns a paginated, optionally filtered list of occupational classes.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getJobClasses(int $page, int $limit, string $filter = ''): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $offset = ($page - 1) * $limit;
    $total  = $this->repository->countJobClasses($filter);
    $data   = $this->repository->getJobClasses($offset, $limit, $filter);

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
   * Orchestrates the creation of a new job class.
   *
   * @param string       $createdBy The ULID of the user making the request.
   * @param CreateJobClassDTO $dto       The validated data transfer object.
   * * @throws ApiException If the job class code is not found, a unique
   * @return array<string, mixed>|null The data of the newly created job class.
   */
  public function createJobClass(string $createdBy, CreateJobClassDTO $dto): ?array
  {
    $dto->validate();

    $duplicateJobClassCode = $this->repository->existsByCode($dto->jobClassCode);
    if ($duplicateJobClassCode) {
      throw new ApiException(
        ErrorType::from('REPEATED_JOB_CLASS_CODE', 'El código de clase ocupacional ya existe')
      );
    }

    $jobClassId = $this->repository->create($dto, $createdBy);
    return $this->getJobClassById($jobClassId);
  }

  /**
   * Orchestrates the update process for an existing job class.
   *
   * @param string       $jobClassId The ULID of the job to update.
   * @param UpdateJobClassDTO $dto   The validated data transfer object.
   * * @throws ApiException If the job or class is not found, a unique constraint is violated, or internal DB error occurs.
   * @return array<string, mixed>|null The data of the updated job class.
   */
  public function updateJobClass(string $jobClassId, UpdateJobClassDTO $dto): ?array
  {
    $dto->validate();

    $existing = $this->repository->findById($jobClassId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('JOB_CLASS_NOT_FOUND', 'La clase ocupacional no existe')
      );
    }

    $currentJobClassCode = (int) ($existing['job_class_code'] ?? $existing['JOB_CLASS_CODE']);

    if (
      $dto->jobClassCode !== null &&
      $dto->jobClassCode !== $currentJobClassCode && 
      $this->repository->existsByCode($dto->jobClassCode)
    ) {
      throw new ApiException(
      ErrorType::from('REPEATED_JOB_CLASS_CODE', 'El código de clase ocupacional ya existe')
    );
}

    $this->repository->update($jobClassId, $dto);
    return $this->getJobClassById($jobClassId);
  }

   /**
   * Orchestrates the logical deletion of a job.
   *
   * @param string $jobClassId     The ULID of the job to delete.
   * @param string $deletedBy The ULID of the user making the request.
   * * @throws ApiException If the job ID is missing, the job does not exist, or the deletion query fails.
   * @return void
   */
  public function deleteJobClass(string $jobClassId, string $deletedBy): void
  {
    if (empty($jobClassId)) {
      throw new ApiException(ErrorType::missingField('job_class_id'));
    }

    $existing = $this->repository->findById($jobClassId);
    if ($existing === null) {
      throw new ApiException(
        ErrorType::from('JOB_CLASS_NOT_FOUND', 'La clase ocupacional no existe')
      );
    }

    $isDeleted = $this->repository->delete($jobClassId, $deletedBy);
    if (!$isDeleted) {
      throw new ApiException(
        ErrorType::from('DELETE_FAILED', 'No se pudo eliminar la clase ocupacional')
      );
    }
  }

  /**
   * Retrieves a paginated list of job with associated metadata.
   *
   * @param int    $page   The requested page number.
   * @param int    $limit  The number of items per page.
   * @param string $filter The search string to filter by job class name.
   * @param string $status The logical deletion status filter.
   * * @throws ApiException If an internal database error occurs.
   * @return array{
   * data: array<int, array<string, mixed>>,
   * meta: array{page: int, limit: int, total: int, total_pages: int}
   * }
   */
  public function getAllJobClasses(
    int $page = 1,
    int $limit = 10,
    string $filter = '',
    string $status = 'active'
  ): array {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $status = $this->normalizeStatus($status);
    $offset = ($page - 1) * $limit;

    $total = $this->repository->countAll(
      $filter,
      $status
    );

    $jobClasses = $this->repository->findAllPaginated(
      $limit,
      $offset,
      $filter,
      $status
    );

    return [
      'data' => $jobClasses,
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
   * @param string $jobClassId  The ULID of the job.
   * @param string $status The logical deletion status filter.
   * * @throws ApiException If the job ID is missing, the job does not exist, or a database error occurs.
   * @return array<string, mixed>|null Associative array containing the job data.
   */
  public function getJobClassById(string $jobClassId, string $status = 'active'): ?array
  {
    if (empty($jobClassId)) {
      throw new ApiException(ErrorType::missingField('job_class_id'));
    }

    $status = $this->normalizeStatus($status);
    $jobClass = $this->repository->findById($jobClassId, $status);

    if ($jobClass === null) {
      throw new ApiException(
        ErrorType::from('JOB_CLASS_NOT_FOUND', 'La clase ocupacional no existe')
      );
    }

    return $jobClass;
  }
}
