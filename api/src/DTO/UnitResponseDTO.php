<?php
declare(strict_types=1);

namespace DTO;

/**
 * UnitResponseDTO
 *
 * Structures the unit data returned in API responses.
 *
 * Responsibilities:
 * - Maps a raw database row to the response shape via fromArray().
 * - Handles Oracle's uppercase column names with a lowercase fallback.
 * - Exposes id, section_id, department_id, name, description, created_at,
 *   created_by and the soft-delete state (is_deleted, deleted_at) in snake_case.
 *
 * @package DTO
 */
final class UnitResponseDTO {
  public readonly string $id;
  public readonly ?string $sectionId;
  public readonly ?string $departmentId;
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $createdAt;
  public readonly string $createdBy;
  public readonly int $isDeleted;
  public readonly ?string $deletedAt;

  private function __construct(
    string $id,
    ?string $sectionId,
    ?string $departmentId,
    string $name,
    ?string $description,
    string $createdAt,
    string $createdBy,
    int $isDeleted,
    ?string $deletedAt
  ) {
    $this->id           = $id;
    $this->sectionId    = $sectionId;
    $this->departmentId = $departmentId;
    $this->name         = $name;
    $this->description  = $description;
    $this->createdAt    = $createdAt;
    $this->createdBy    = $createdBy;
    $this->isDeleted    = $isDeleted;
    $this->deletedAt    = $deletedAt;
  }

  /**
   * Accepts rows from Oracle (uppercase keys) or lowercase aliases.
   *
   * @param array<string, mixed> $data
   */
  public static function fromArray(array $data): self {
    $sectionId    = $data['SECTION_ID']    ?? $data['section_id']    ?? null;
    $departmentId = $data['DEPARTMENT_ID'] ?? $data['department_id'] ?? null;
    $description  = $data['DESCRIPTION']   ?? $data['description']    ?? null;
    $deletedAt    = $data['DELETED_AT']    ?? $data['deleted_at']     ?? null;

    return new self(
      (string) ($data['UNIT_ID']    ?? $data['unit_id']    ?? ''),
      $sectionId    !== null ? (string) $sectionId    : null,
      $departmentId !== null ? (string) $departmentId : null,
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
   *   id: string,
   *   section_id: string|null,
   *   department_id: string|null,
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
      'id'            => $this->id,
      'section_id'    => $this->sectionId,
      'department_id' => $this->departmentId,
      'name'          => $this->name,
      'description'   => $this->description,
      'created_at'    => $this->createdAt,
      'created_by'    => $this->createdBy,
      'is_deleted'    => $this->isDeleted,
      'deleted_at'    => $this->deletedAt,
    ];
  }
}
