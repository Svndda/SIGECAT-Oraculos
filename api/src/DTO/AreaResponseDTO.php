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
 * - Exposes only the fields relevant to clients: id, name, createdAt.
 *
 * @package DTO
 */
final class AreaResponseDTO {
  public readonly string $id;
  public readonly string $name;
  public readonly string $createdAt;

  private function __construct(string $id, string $name, string $createdAt) {
    $this->id = $id;
    $this->name = $name;
    $this->createdAt = $createdAt;
  }

  /**
   * @param array{
   *     area_id: string,
   *     name: string,
   *     created_at: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) $data['area_id'],
      (string) $data['name'],
      (string) $data['created_at'],
    );
  }

  /** @return array{id: string, name: string, createdAt: string} */
  public function toArray(): array {
    return [
      'id'        => $this->id,
      'name'      => $this->name,
      'createdAt' => $this->createdAt,
    ];
  }
}
