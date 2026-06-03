<?php
declare(strict_types=1);

namespace DTO;

/**
 * AreaResponseDTO
 *
 * Structures the area data returned in API responses.
 *
 * Responsibilities:
 * - Maps a raw database row to the response shape via fromArray().
 * - Handles Oracle's uppercase column names with a lowercase fallback.
 * - Exposes id, name, description, created_at, created_by and the
 *   soft-delete state (is_deleted, deleted_at) in snake_case.
 *
 * @package DTO
 */
final class AreaResponseDTO {
  public readonly string $id;
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $createdAt;
  public readonly string $createdBy;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $name,
    ?string $description,
    string $createdAt,
    string $createdBy,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id          = $id;
    $this->name        = $name;
    $this->description = $description;
    $this->createdAt   = $createdAt;
    $this->createdBy   = $createdBy;
    $this->isDeleted   = $isDeleted;
    $this->deletedAt   = $deletedAt;
  }

  /**
   * Accepts rows from Oracle (uppercase keys) or lowercase aliases.
   *
   * @param array<string, mixed> $data
   */
  public static function fromArray(array $data): self {
    $description = $data['DESCRIPTION'] ?? $data['description'] ?? null;
    $deletedAt   = $data['DELETED_AT']  ?? $data['deleted_at']  ?? null;

    return new self(
      (string) ($data['AREA_ID']    ?? $data['area_id']    ?? ''),
      (string) ($data['NAME']       ?? $data['name']       ?? ''),
      $description !== null ? (string) $description : null,
      (string) ($data['CREATED_AT'] ?? $data['created_at'] ?? ''),
      (string) ($data['CREATED_BY'] ?? $data['created_by'] ?? ''),
      (int)    ($data['IS_DELETED'] ?? $data['is_deleted'] ?? 0),
      $deletedAt !== null ? (string) $deletedAt : null,
    );
  }

  /**
   * @return array{
   *   area_id: string,
   *   name: string,
   *   description: string|null,
   *   created_at: string,
   *   created_by: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array {
    return [
      'area_id'     => $this->id,
      'name'        => $this->name,
      'description' => $this->description,
      'created_at'  => $this->createdAt,
      'created_by'  => $this->createdBy,
      'is_deleted'  => $this->isDeleted,
      'deleted_at'  => $this->deletedAt,
    ];
  }
}
