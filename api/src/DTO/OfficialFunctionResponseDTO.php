<?php
declare(strict_types=1);

namespace DTO;

/**
 * OfficialFunctionResponseDTO
 *
 * Shapes an official function (OFFICIAL_FUNCTIONS) row for API responses:
 * snake_case keys with an `id` (not official_function_id). Each function belongs
 * to a JOB ("tipo de puesto") through job_id. Tolerates Oracle uppercase or
 * lowercase keys.
 *
 * @package DTO
 */
final class OfficialFunctionResponseDTO
{
  public readonly string $id;
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $jobId;
  public readonly ?float $expectedTime;
  public readonly string $createdAt;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $name,
    ?string $description,
    string $jobId,
    ?float $expectedTime,
    string $createdAt,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id = $id;
    $this->name = $name;
    $this->description = $description;
    $this->jobId = $jobId;
    $this->expectedTime = $expectedTime;
    $this->createdAt = $createdAt;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(mixed $v): ?string => $v !== null ? (string) $v : null;

    $expected = $get('expected_time');

    return new self(
      (string) ($get('official_function_id') ?? ''),
      (string) ($get('name') ?? ''),
      $str($get('description')),
      (string) ($get('job_id') ?? ''),
      $expected !== null ? (float) $expected : null,
      (string) ($get('created_at') ?? ''),
      (int) ($get('is_deleted') ?? 0),
      $str($get('deleted_at')),
    );
  }

  /**
   * @return array{
   *   id: string,
   *   name: string,
   *   description: string|null,
   *   job_id: string,
   *   expected_time: float|null,
   *   created_at: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array
  {
    return [
      'id'            => $this->id,
      'name'          => $this->name,
      'description'   => $this->description,
      'job_id'        => $this->jobId,
      'expected_time' => $this->expectedTime,
      'created_at'    => $this->createdAt,
      'is_deleted'    => $this->isDeleted,
      'deleted_at'    => $this->deletedAt,
    ];
  }
}
