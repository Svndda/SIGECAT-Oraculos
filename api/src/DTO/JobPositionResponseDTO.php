<?php
declare(strict_types=1);

namespace DTO;

/**
 * JobPositionResponseDTO
 *
 * Shapes a plaza (JOB_POSITION) row for API responses: snake_case keys with an
 * `id` (not job_position_id). Exposes all four mutually-exclusive parent FKs so
 * the client can tell (and navigate to) the entity the plaza belongs to.
 * Tolerates Oracle uppercase or lowercase keys.
 *
 * @package DTO
 */
final class JobPositionResponseDTO {
  public readonly string $id;
  public readonly string $jobPositionNumber;
  public readonly ?string $description;
  public readonly string $jobId;
  public readonly ?string $areaId;
  public readonly ?string $departmentId;
  public readonly ?string $sectionId;
  public readonly ?string $unitId;
  public readonly ?string $userId;
  public readonly string $createdAt;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $jobPositionNumber,
    ?string $description,
    string $jobId,
    ?string $areaId,
    ?string $departmentId,
    ?string $sectionId,
    ?string $unitId,
    ?string $userId,
    string $createdAt,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id = $id;
    $this->jobPositionNumber = $jobPositionNumber;
    $this->description = $description;
    $this->jobId = $jobId;
    $this->areaId = $areaId;
    $this->departmentId = $departmentId;
    $this->sectionId = $sectionId;
    $this->unitId = $unitId;
    $this->userId = $userId;
    $this->createdAt = $createdAt;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self {
    $get = static fn(string $c): ?string => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(?string $v): ?string => $v !== null ? (string) $v : null;

    return new self(
      (string) ($get('job_position_id') ?? ''),
      (string) ($get('job_position_number') ?? ''),
      $str($get('description')),
      (string) ($get('job_id') ?? ''),
      $str($get('area_id')),
      $str($get('department_id')),
      $str($get('section_id')),
      $str($get('unit_id')),
      $str($get('user_id')),
      (string) ($get('created_at') ?? ''),
      (int) ($get('is_deleted') ?? 0),
      $str($get('deleted_at')),
    );
  }

  /**
   * @return array{
   *   id: string,
   *   job_position_number: string,
   *   description: string|null,
   *   job_id: string,
   *   area_id: string|null,
   *   department_id: string|null,
   *   section_id: string|null,
   *   unit_id: string|null,
   *   user_id: string|null,
   *   created_at: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array {
    return [
      'id'                   => $this->id,
      'job_position_number' => $this->jobPositionNumber,
      'description'          => $this->description,
      'job_id' => $this->jobId,
      'area_id'              => $this->areaId,
      'department_id'        => $this->departmentId,
      'section_id'           => $this->sectionId,
      'unit_id'              => $this->unitId,
      'user_id'              => $this->userId,
      'created_at'           => $this->createdAt,
      'is_deleted'           => $this->isDeleted,
      'deleted_at'           => $this->deletedAt,
    ];
  }
}
