<?php
declare(strict_types=1);

namespace DTO;

/**
 * UserResponseDTO
 *
 * Structures the user data returned in API responses.
 *
 * Responsibilities:
 * - Maps a raw database row to the response shape via fromArray().
 * - Handles Oracle's uppercase column names with a lowercase fallback.
 * - Collapses the extended UCR name model (first_name/second_name and
 *   first_last_name/second_last_name) into the first_name/last_name pair
 *   the web client consumes, falling back to a legacy last_name column.
 * - Exposes id, email, first_name, last_name, role plus active/audit
 *   state in snake_case (with an `id` key, not user_id).
 *
 * @package DTO
 */
final class UserResponseDTO {
  public readonly string $id;
  public readonly string $email;
  public readonly string $firstName;
  public readonly string $lastName;
  public readonly string $role;
  public readonly int $isActive;
  public readonly string $createdAt;
  public readonly string $createdBy;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    string $email,
    string $firstName,
    string $lastName,
    string $role,
    int $isActive,
    string $createdAt,
    string $createdBy,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id        = $id;
    $this->email     = $email;
    $this->firstName = $firstName;
    $this->lastName  = $lastName;
    $this->role      = $role;
    $this->isActive  = $isActive;
    $this->createdAt = $createdAt;
    $this->createdBy = $createdBy;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /**
   * Accepts rows from Oracle (uppercase keys) or lowercase aliases.
   *
   * @param array<string, mixed> $data
   */
  public static function fromArray(array $data): self {
    $get = static fn(string $col): ?string => $data[strtoupper($col)] ?? $data[strtolower($col)] ?? null;

    $firstName  = (string) ($get('first_name') ?? '');
    $secondName = (string) ($get('second_name') ?? '');
    // Prefer the extended first_last_name, fall back to a legacy last_name.
    $firstLast  = (string) ($get('first_last_name') ?? $get('last_name') ?? '');
    $secondLast = (string) ($get('second_last_name') ?? '');

    $fullFirst = trim($firstName . ' ' . $secondName);
    $fullLast  = trim($firstLast . ' ' . $secondLast);

    $deletedAt = $get('deleted_at');

    return new self(
      (string) ($get('user_id') ?? ''),
      (string) ($get('email') ?? ''),
      $fullFirst,
      $fullLast,
      (string) ($get('role') ?? ''),
      (int)    ($get('is_active') ?? 0),
      (string) ($get('created_at') ?? ''),
      (string) ($get('created_by') ?? ''),
      (int)    ($get('is_deleted') ?? 0),
      $deletedAt !== null ? (string) $deletedAt : null,
    );
  }

  /**
   * @return array{
   *   id: string,
   *   email: string,
   *   first_name: string,
   *   last_name: string,
   *   role: string,
   *   is_active: int,
   *   created_at: string,
   *   created_by: string,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array {
    return [
      'id'         => $this->id,
      'email'      => $this->email,
      'first_name' => $this->firstName,
      'last_name'  => $this->lastName,
      'role'       => $this->role,
      'is_active'  => $this->isActive,
      'created_at' => $this->createdAt,
      'created_by' => $this->createdBy,
      'is_deleted' => $this->isDeleted,
      'deleted_at' => $this->deletedAt,
    ];
  }
}
