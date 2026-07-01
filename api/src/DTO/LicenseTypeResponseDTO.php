<?php
declare(strict_types=1);

namespace DTO;

/**
 * LicenseTypeResponseDTO
 *
 * Shapes a license type (LICENSE_TYPES) row for API responses: snake_case keys
 * with an `id` (not license_type_id). Tolerates Oracle uppercase or lowercase
 * keys.
 *
 * @package DTO
 */
final class LicenseTypeResponseDTO
{
  public readonly string $id;
  public readonly string $name;
  public readonly string $createdAt;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $name,
    string $createdAt,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id = $id;
    $this->name = $name;
    $this->createdAt = $createdAt;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(mixed $v): ?string => $v !== null ? (string) $v : null;

    return new self(
      (string) ($get('license_type_id') ?? ''),
      (string) ($get('name') ?? ''),
      (string) ($get('created_at') ?? ''),
      (int) ($get('is_deleted') ?? 0),
      $str($get('deleted_at')),
    );
  }

  /**
   * @return array{
   *   id: string,
   *   name: string,
   *   created_at: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array
  {
    return [
      'id'         => $this->id,
      'name'       => $this->name,
      'created_at' => $this->createdAt,
      'is_deleted' => $this->isDeleted,
      'deleted_at' => $this->deletedAt,
    ];
  }
}
