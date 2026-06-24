<?php
declare(strict_types=1);

namespace DTO;

/**
 * JobFunctionResponseDTO
 *
 * Shapes a declaration function (JOB_FUNCTIONS) row for API responses:
 * snake_case keys with an `id` (not job_function_id). Tolerates Oracle
 * uppercase or lowercase keys.
 *
 * @package DTO
 */
final class JobFunctionResponseDTO
{
  public readonly string $id;
  public readonly string $userId;
  public readonly string $jobPositionId;
  public readonly string $declarationId;
  public readonly ?string $officialFunctionId;
  public readonly ?string $customFunctionId;
  public readonly ?float $overtime;
  public readonly ?string $justification;
  public readonly string $frequency;
  public readonly string $startsAt;
  public readonly string $endsAt;

  private function __construct(
    string $id,
    string $userId,
    string $jobPositionId,
    string $declarationId,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    ?float $overtime,
    ?string $justification,
    string $frequency,
    string $startsAt,
    string $endsAt
  ) {
    $this->id = $id;
    $this->userId = $userId;
    $this->jobPositionId = $jobPositionId;
    $this->declarationId = $declarationId;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->overtime = $overtime;
    $this->justification = $justification;
    $this->frequency = $frequency;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(mixed $v): ?string => $v !== null ? (string) $v : null;

    $overtime = $get('overtime');

    return new self(
      (string) ($get('job_function_id') ?? ''),
      (string) ($get('user_id') ?? ''),
      (string) ($get('job_position_id') ?? ''),
      (string) ($get('declaration_id') ?? ''),
      $str($get('official_function_id')),
      $str($get('custom_function_id')),
      $overtime !== null ? (float) $overtime : null,
      $str($get('justification')),
      (string) ($get('frequency') ?? ''),
      (string) ($get('starts_at') ?? ''),
      (string) ($get('ends_at') ?? ''),
    );
  }

  /**
   * @return array{
   *   id: string, user_id: string, job_position_id: string, declaration_id: string,
   *   official_function_id: string|null, custom_function_id: string|null,
   *   overtime: float|null, justification: string|null, frequency: string,
   *   starts_at: string, ends_at: string
   * }
   */
  public function toArray(): array
  {
    return [
      'id'                   => $this->id,
      'user_id'              => $this->userId,
      'job_position_id'      => $this->jobPositionId,
      'declaration_id'       => $this->declarationId,
      'official_function_id' => $this->officialFunctionId,
      'custom_function_id'   => $this->customFunctionId,
      'overtime'             => $this->overtime,
      'justification'        => $this->justification,
      'frequency'            => $this->frequency,
      'starts_at'            => $this->startsAt,
      'ends_at'              => $this->endsAt,
    ];
  }
}
