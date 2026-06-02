<?php
declare(strict_types=1);

namespace Services;

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
}
