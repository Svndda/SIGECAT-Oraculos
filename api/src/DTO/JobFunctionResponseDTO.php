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
  public readonly ?int $overtimeMinutes;
  public readonly ?string $justification;
  public readonly string $frequency;
  public readonly int $durationMinutes;

  private function __construct(
    string $id,
    string $userId,
    string $jobPositionId,
    string $declarationId,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    ?int $overtimeMinutes,
    ?string $justification,
    string $frequency,
    int $durationMinutes
  ) {
    $this->id = $id;
    $this->userId = $userId;
    $this->jobPositionId = $jobPositionId;
    $this->declarationId = $declarationId;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->overtimeMinutes = $overtimeMinutes;
    $this->justification = $justification;
    $this->frequency = $frequency;
    $this->durationMinutes = $durationMinutes;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(mixed $v): ?string => $v !== null ? (string) $v : null;

    $overtimeMinutes = $get('overtime_minutes');

    return new self(
      (string) ($get('job_function_id') ?? ''),
      (string) ($get('user_id') ?? ''),
      (string) ($get('job_position_id') ?? ''),
      (string) ($get('declaration_id') ?? ''),
      $str($get('official_function_id')),
      $str($get('custom_function_id')),
      $overtimeMinutes !== null ? (int) $overtimeMinutes : null,
      $str($get('justification')),
      (string) ($get('frequency') ?? ''),
      (int) ($get('duration_minutes') ?? 0),
    );
  }

  /**
   * @return array{
   *   id: string, user_id: string, job_position_id: string, declaration_id: string,
   *   official_function_id: string|null, custom_function_id: string|null,
   *   overtime_minutes: int|null, justification: string|null, frequency: string,
   *   duration_minutes: int
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
      'overtime_minutes'     => $this->overtimeMinutes,
      'justification'        => $this->justification,
      'frequency'            => $this->frequency,
      'duration_minutes'     => $this->durationMinutes,
    ];
  }
}