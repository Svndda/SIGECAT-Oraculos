<?php
declare(strict_types=1);

namespace Controllers;

use Http\ApiException;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\JobClassService;

/**
 * JobClassController
 *
 * HTTP layer for reading occupational classes (listing only). Admin only.
 *
 * @package Controllers
 */
class JobClassController
{
  private AuthService $authService;
  private JobClassService $jobClassService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->jobClassService = new JobClassService($this->pdo);
  }

  /**
   * GET /job-classes
   * Query params: page, limit, filter. Admin only.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page   = max(1, (int) ($_GET['page'] ?? 1));
      $limit  = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
      $filter = trim((string) ($_GET['filter'] ?? ''));

      $result = $this->jobClassService->getJobClasses($page, $limit, $filter);

      Response::success($result['data'], $result['meta'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
