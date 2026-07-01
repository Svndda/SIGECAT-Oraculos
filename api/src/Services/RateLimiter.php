<?php
declare(strict_types=1);

namespace Services;

use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\RateLimitRepository;

/**
 * RateLimiter
 *
 * Application-level, fixed-window rate limiting for abuse-prone endpoints
 * (login, password recovery). Buckets are identified by a SHA-256 hash of
 * "action|identifier" so no raw IPs or emails are persisted, and counters live
 * in RATE_LIMITS so the limit holds across PHP workers and hosts.
 *
 * @package Services
 */
final class RateLimiter
{
  private RateLimitRepository $repository;

  public function __construct(PDO $pdo)
  {
    $this->repository = new RateLimitRepository($pdo);
  }

  /**
   * Counts one attempt for ($action, $identifier) and throws a 429 once the
   * attempts in the current window exceed $maxAttempts. Storage failures are
   * swallowed so the limiter can never take the endpoint down (fail-open).
   *
   * @param string $action        Logical bucket, e.g. 'auth.login'.
   * @param string $identifier     Caller identity, usually the client IP.
   * @param int    $maxAttempts    Allowed attempts per window.
   * @param int    $windowSeconds  Window length in seconds.
   * @throws ApiException 429 when the limit is exceeded.
   */
  public function enforce(string $action, string $identifier, int $maxAttempts, int $windowSeconds): void
  {
    try {
      $key = hash('sha256', $action . '|' . $identifier);
      $hits = $this->repository->hit($key, $windowSeconds);
    } catch (\Throwable $e) {
      // Never let a limiter/storage error block legitimate traffic.
      Logger::error('security', 'Fallo del limitador de solicitudes', 'rate_limit.error', [
        'action' => $action,
        'error'  => $e->getMessage(),
      ]);
      return;
    }

    if ($hits > $maxAttempts) {
      Logger::warning('security', 'Límite de solicitudes excedido', 'rate_limit.exceeded', [
        'action' => $action,
        'hits'   => $hits,
      ]);
      throw new ApiException(ErrorType::tooManyRequests(), 429);
    }
  }
}
