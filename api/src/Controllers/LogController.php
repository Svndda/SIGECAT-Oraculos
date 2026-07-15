<?php
declare(strict_types=1);

namespace Controllers;

use Http\ApiException;
use Http\Response;
use Services\AuthService;
use Services\LogService;
use PDO;

/**
 * LogController
 *
 * HTTP layer for reading the system-wide audit log (SYSTEM_LOGS). All endpoints
 * are admin-only. Log writing is implicit across the application via the
 * {@see \Services\Logger} facade and has no controller of its own.
 *
 * @package Controllers
 */
final class LogController
{
  private AuthService $authService;
  private LogService $logService;

  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->logService = new LogService($this->pdo);
  }

  /**
   * GET /logs
   *
   * Paginated, filterable list of log entries. Supported query params:
   * level, category, user_id, action, search, date_from, date_to, page, limit.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page  = (int) ($_GET['page'] ?? 1);
      $limit = (int) ($_GET['limit'] ?? 20);

      $filters = [
        'level'     => $_GET['level']     ?? null,
        'category'  => $_GET['category']  ?? null,
        'user_id'   => $_GET['user_id']   ?? null,
        'action'    => $_GET['action']    ?? null,
        'search'    => $_GET['search']    ?? null,
        'date_from' => $_GET['date_from'] ?? null,
        'date_to'   => $_GET['date_to']   ?? null,
        'scope'     => $_GET['scope']     ?? null,
      ];

      $result = $this->logService->list($filters, $page, $limit);
      $meta = array_merge($result['meta'], ['message' => 'Registros obtenidos exitosamente']);

      Response::success($result['data'], $meta);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * GET /logs/facets
   *
   * Distinct levels and categories present in the log, for filter controls.
   */
  public function facets(): void
  {
    try {
      $this->authService->requireAdmin();
      Response::success(
        $this->logService->facets(),
        ['message' => 'Facetas obtenidas exitosamente']
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
