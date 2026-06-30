<?php
declare(strict_types=1);

namespace Services;

use Http\Request;
use Repositories\LogRepository;
use PDO;
use Throwable;

/**
 * Logger
 *
 * Central, application-wide logging facade. A single shared PDO connection is
 * registered once during bootstrap (see config/init bootstrap in index.php) and
 * every layer emits structured events through the static helpers below.
 *
 * Guarantees:
 *   * Logging never throws. A failure to persist a log must never break the
 *     request that was being served, so all persistence errors are swallowed
 *     and mirrored to the PHP error log as a last resort.
 *   * Logging never recurses. While a log row is being written, further log
 *     calls (e.g. a PDO error raised by the insert itself) are routed straight
 *     to the error log instead of attempting another database write.
 *
 * Levels follow the usual ascending severity: DEBUG, INFO, WARNING, ERROR,
 * CRITICAL. Categories are free-form short tags (auth, request, database,
 * security, ...) used to group related events in the admin viewer.
 *
 * @package Services
 */
final class Logger
{
  public const DEBUG    = 'DEBUG';
  public const INFO     = 'INFO';
  public const WARNING  = 'WARNING';
  public const ERROR    = 'ERROR';
  public const CRITICAL = 'CRITICAL';

  /** @var PDO|null Shared connection used to persist logs. */
  private static ?PDO $pdo = null;

  /** @var bool Re-entrancy guard to avoid infinite logging loops. */
  private static bool $writing = false;

  /**
   * Registers the database connection used for persistence. Called once during
   * bootstrap. Without it the Logger degrades gracefully to the PHP error log.
   *
   * @param PDO $pdo Active database connection.
   * @return void
   */
  public static function init(PDO $pdo): void
  {
    self::$pdo = $pdo;
  }

  /** @param array<string, mixed> $context */
  public static function debug(string $category, string $message, ?string $action = null, array $context = []): void
  {
    self::log(self::DEBUG, $category, $message, $action, $context);
  }

  /** @param array<string, mixed> $context */
  public static function info(string $category, string $message, ?string $action = null, array $context = []): void
  {
    self::log(self::INFO, $category, $message, $action, $context);
  }

  /** @param array<string, mixed> $context */
  public static function warning(string $category, string $message, ?string $action = null, array $context = []): void
  {
    self::log(self::WARNING, $category, $message, $action, $context);
  }

  /** @param array<string, mixed> $context */
  public static function error(string $category, string $message, ?string $action = null, array $context = []): void
  {
    self::log(self::ERROR, $category, $message, $action, $context);
  }

  /** @param array<string, mixed> $context */
  public static function critical(string $category, string $message, ?string $action = null, array $context = []): void
  {
    self::log(self::CRITICAL, $category, $message, $action, $context);
  }

  /**
   * Core logging entry point. Builds a normalized entry from the explicit
   * arguments plus the ambient request context (actor, IP, method, path) and
   * persists it, falling back to the PHP error log on any failure.
   *
   * @param string               $level    One of the level constants.
   * @param string               $category Short grouping tag.
   * @param string               $message  Human-readable summary.
   * @param string|null          $action   Optional machine action key (e.g. 'user.login').
   * @param array<string, mixed> $context  Optional structured detail (stored as JSON).
   * @param int|null             $statusCode Optional HTTP status to associate.
   * @return void
   */
  public static function log(
    string $level,
    string $category,
    string $message,
    ?string $action = null,
    array $context = [],
    ?int $statusCode = null
  ): void {
    if (self::$writing) {
      return;
    }

    $entry = [
      'level'       => $level,
      'category'    => $category,
      'action'      => $action,
      'message'     => mb_substr($message, 0, 1000),
      'context'     => $context === [] ? null : self::encodeContext($context),
      'user_id'     => self::currentUserId(),
      'ip_address'  => self::clientIp(),
      'http_method' => $_SERVER['REQUEST_METHOD'] ?? null,
      'http_path'   => self::requestPath(),
      'status_code' => $statusCode,
    ];

    if (self::$pdo === null) {
      self::fallback($entry);
      return;
    }

    self::$writing = true;
    try {
      (new LogRepository(self::$pdo))->insert($entry);
    } catch (Throwable $e) {
      self::fallback($entry, $e);
    } finally {
      self::$writing = false;
    }
  }

  /**
   * Records the outcome of the current HTTP request. Intended to be hooked on
   * shutdown so it captures the final response status regardless of how the
   * controller terminated (including Response::* calls that exit()).
   *
   * Health checks and the log endpoints themselves are skipped to keep the log
   * free of self-referential noise.
   *
   * @return void
   */
  public static function logRequest(): void
  {
    $path = self::requestPath();
    if ($path === null || str_starts_with($path, '/logs')) {
      return;
    }

    $status = http_response_code();
    $status = is_int($status) ? $status : null;

    $level = match (true) {
      $status !== null && $status >= 500 => self::ERROR,
      $status !== null && $status >= 400 => self::WARNING,
      default                            => self::INFO,
    };

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    self::log(
      $level,
      'request',
      sprintf('%s %s -> %s', $method, $path, $status ?? '???'),
      'http.request',
      [],
      $status
    );
  }

  /**
   * Encodes the context array as compact JSON, degrading to a placeholder if
   * the payload cannot be encoded (e.g. malformed UTF-8).
   *
   * @param array<string, mixed> $context
   * @return string
   */
  private static function encodeContext(array $context): string
  {
    $json = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $json === false ? '{"_error":"context encoding failed"}' : $json;
  }

  /**
   * Resolves the currently authenticated user's id, if any.
   *
   * @return string|null
   */
  private static function currentUserId(): ?string
  {
    $user = Request::getUser();
    if ($user === null) {
      return null;
    }
    $id = $user['user_id'] ?? null;
    return $id === null ? null : (string) $id;
  }

  /**
   * Best-effort client IP, honouring the first hop of X-Forwarded-For when the
   * API sits behind a proxy.
   *
   * @return string|null
   */
  private static function clientIp(): ?string
  {
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded !== '') {
      return trim(explode(',', $forwarded)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
  }

  /**
   * Request path without the query string, or null on the CLI.
   *
   * @return string|null
   */
  private static function requestPath(): ?string
  {
    $uri = $_SERVER['REQUEST_URI'] ?? null;
    if ($uri === null) {
      return null;
    }
    $path = strtok($uri, '?') ?: $uri;
    $basePath = '/api/public';
    if (stripos($path, $basePath) === 0) {
      $path = substr($path, strlen($basePath));
    }
    return $path ?: '/';
  }

  /**
   * Last-resort sink when the database is unavailable or the insert fails.
   *
   * @param array<string, mixed> $entry
   * @param Throwable|null       $cause
   * @return void
   */
  private static function fallback(array $entry, ?Throwable $cause = null): void
  {
    $line = sprintf(
      '[SIGECAT][%s][%s] %s%s',
      $entry['level'],
      $entry['category'],
      $entry['message'],
      $entry['context'] !== null ? ' ' . $entry['context'] : ''
    );
    if ($cause !== null) {
      $line .= ' (log persistence failed: ' . $cause->getMessage() . ')';
    }
    error_log($line);
  }
}
