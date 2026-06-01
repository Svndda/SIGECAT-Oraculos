<?php
declare(strict_types=1);

namespace DTO;

/**
 * JobPositionResponseDTO
 *
 * Shapes a plaza (JOB_POSITION) row for API responses: snake_case keys with an
 * `id` (not job_position_id). Tolerates Oracle uppercase or lowercase keys.
 *
 * @package DTO
 */
final class JobPositionResponseDTO {
  public readonly string $id;
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $jobPositionTypeId;
  public readonly ?string $areaId;
  public readonly ?string $userId;
  public readonly string $createdAt;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $name,
    ?string $description,
    string $jobPositionTypeId,
    ?string $areaId,
    ?string $userId,
    string $createdAt,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id = $id;
    $this->name = $name;
    $this->description = $description;
    $this->jobPositionTypeId = $jobPositionTypeId;
    $this->areaId = $areaId;
    $this->userId = $userId;
    $this->createdAt = $createdAt;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self {
    $get = static fn(string $c): ?string => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;

    $description = $get('description');
    $areaId      = $get('area_id');
    $userId      = $get('user_id');
    $deletedAt   = $get('deleted_at');

    return new self(
      (string) ($get('job_position_id') ?? ''),
      (string) ($get('name') ?? ''),
      $description !== null ? (string) $description : null,
      (string) ($get('job_position_type_id') ?? ''),
      $areaId !== null ? (string) $areaId : null,
      $userId !== null ? (string) $userId : null,
      (string) ($get('created_at') ?? ''),
      (int)    ($get('is_deleted') ?? 0),
      $deletedAt !== null ? (string) $deletedAt : null,
    );
  }

  /**
   * @return array{
   *   id: string,
   *   name: string,
   *   description: string|null,
   *   job_position_type_id: string,
   *   area_id: string|null,
   *   user_id: string|null,
   *   created_at: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array {
    return [
      'id'                   => $this->id,
      'name'                 => $this->name,
      'description'          => $this->description,
      'job_position_type_id' => $this->jobPositionTypeId,
      'area_id'              => $this->areaId,
      'user_id'              => $this->userId,
      'created_at'           => $this->createdAt,
      'is_deleted'           => $this->isDeleted,
      'deleted_at'           => $this->deletedAt,
    ];
  }
}
