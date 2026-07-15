<?php
declare(strict_types=1);

namespace Services;

use DTO\LogResponseDTO;
use PDO;
use Repositories\LogRepository;

/**
 * LogService
 *
 * Read-side business logic for SYSTEM_LOGS. Sanitizes incoming filter/pagination
 * input and maps rows to response DTOs. Writing is handled out-of-band by the
 * {@see Logger} facade, so this service is intentionally read-only.
 *
 * @package Services
 */
final class LogService
{
  private LogRepository $logRepository;

  public function __construct(PDO $pdo)
  {
    $this->logRepository = new LogRepository($pdo);
  }

  /**
   * Returns a paginated, filtered page of log entries plus pagination meta.
   *
   * @param array<string, mixed> $filters Raw request filters.
   * @param int $page  Requested page (clamped to >= 1).
   * @param int $limit Requested page size (clamped to 1..100).
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
   */
  public function list(array $filters, int $page, int $limit): array
  {
    $page = max(1, $page);
    $limit = min(100, max(1, $limit));

    $clean = $this->sanitizeFilters($filters);
    $result = $this->logRepository->query($clean, $page, $limit);

    $data = array_map(
      static fn(array $row): array => LogResponseDTO::fromArray($row)->toArray(),
      $result['data']
    );

    $total = $result['total'];
    $totalPages = (int) ceil($total / $limit);

    return [
      'data' => $data,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => $totalPages,
      ],
    ];
  }

  /**
   * Distinct facet values (levels, categories) for building filter controls.
   *
   * @return array{levels: array<int, string>, categories: array<int, string>}
   */
  public function facets(): array
  {
    return $this->logRepository->facets();
  }

  /**
   * Keeps only recognized filters and normalizes whitespace. A valid level is
   * upper-cased to match the stored CHECK-constrained values.
   *
   * @param array<string, mixed> $filters
   * @return array<string, mixed>
   */
  private function sanitizeFilters(array $filters): array
  {
    $clean = [];

    foreach (['category', 'user_id', 'action', 'search', 'date_from', 'date_to'] as $key) {
      $value = trim((string) ($filters[$key] ?? ''));
      if ($value !== '') {
        $clean[$key] = $value;
      }
    }

    $level = strtoupper(trim((string) ($filters['level'] ?? '')));
    if (in_array($level, [Logger::DEBUG, Logger::INFO, Logger::WARNING, Logger::ERROR, Logger::CRITICAL], true)) {
      $clean['level'] = $level;
    }

    // Opt-in narrowing to business events only (excludes server/technical noise).
    if (($filters['scope'] ?? '') === 'business') {
      $clean['scope'] = 'business';
    }

    return $clean;
  }
}
