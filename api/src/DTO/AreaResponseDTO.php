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
 * - Exposes id, name, description, and created_at in snake_case.
 *
 * @package DTO
 */
final class AreaResponseDTO {
  public readonly string $id;
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $createdAt;
  public readonly string $createdBy;

  private function __construct(
    string $id,
    string $name,
    ?string $description,
    string $createdAt,
    string $createdBy
  ) {
    $this->id          = $id;
    $this->name        = $name;
    $this->description = $description;
    $this->createdAt   = $createdAt;
    $this->createdBy   = $createdBy;
  }

  /**
   * Accepts rows from Oracle (uppercase keys) or lowercase aliases.
   *
   * @param array<string, mixed> $data
   */
  public static function fromArray(array $data): self {
    $description = $data['DESCRIPTION'] ?? $data['description'] ?? null;

    return new self(
      (string) ($data['AREA_ID']    ?? $data['area_id']    ?? ''),
      (string) ($data['NAME']       ?? $data['name']       ?? ''),
      $description !== null ? (string) $description : null,
      (string) ($data['CREATED_AT'] ?? $data['created_at'] ?? ''),
      (string) ($data['CREATED_BY'] ?? $data['created_by'] ?? ''),
    );
  }

  /** @return array{id: string, name: string, description: string|null, created_at: string, created_by: string} */
  public function toArray(): array {
    return [
      'id'          => $this->id,
      'name'        => $this->name,
      'description' => $this->description,
      'created_at'  => $this->createdAt,
      'created_by'  => $this->createdBy,
    ];
  }
}
