<?php
declare(strict_types= 1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;


/**
 * UpdateSectionDTO
 *
 * Encapsulates and validates the data used to update an existing section.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Ensures the department identifier (section_id) is provided.
 * - Supports partial updates (area_id, name, description are optional).
 * - Validates each field only if it is present in the request.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateSectionDTO {
  public string $sectionId;
  public ?string $areaId;
  public ?string $name;
  public ?string $description;
  public int $isDeleted;
  public ?string $deletedAt;

  private function __construct(string $sectionId, ?string $areaId,
      ?string $name, ?string $description, int $isDeleted, ?string $deletedAt) {
    $this->sectionId = $sectionId;
    $this->areaId = $areaId;
    $this->name = $name;
    $this->description = $description;
    $this->isDeleted = $isDeleted;
    $this->deletedAt = $deletedAt;
  }

  /**
 * @param array{
 *     section_id?: string,
 *     area_id?: string,
 *     name?: string,
 *     description?: string,
 *     is_deleted?: int,
 *     deleted_at?: string
 * } $data
 */
  public static function fromArray(array $data): self {
    $deletedAt = $data['deleted_at']  ?? $data['deleted_at']  ?? null;
    
    return new self(
      (string) ($data['section_id'] ?? ''),
      isset($data['area_id']) ? (string) $data['area_id'] : null,
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['description']) ? (string) $data['description'] : null,
      (int) ($data['is_deleted'] ?? $data['is_deleted'] ?? 0),
      $deletedAt !== null ? (string) $deletedAt : null
    );
  }

  public function validation(): void {
    // section_id is required for identifying which department to update.
    if (empty($this->sectionId)) {
      throw new ApiException(ErrorType::missingField('section_id'));
    }

    // Validate area_id if it is provided (optional field)
    if ($this->areaId !== null && empty($this->areaId)) {
      throw new ApiException(ErrorType::invalidField('area_id'));
    }

    // Validate name if it is provided (optional field)
    if ($this->name !== null) {
      if (empty($this->name)) {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::from(
            'INVALID_SECTION_NAME',
            'El nombre de la sección no puede exceder los 110 caracteres'
          )
        );
      }
    }

    // Validate description if it is provided (optional field)
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_SECTION_DESC',
          'La descripción de la sección no puede exceder los 255 caracteres'
        )
      );
    }

    // Ensure that at least one updatable field is provided.
    if ($this->areaId === null && $this->name === null &&
        $this->description === null) {
      throw new ApiException(
        ErrorType::from(
        'INVALID_SECTION_UPDATE',
        'No se pudo actualizar la sección debido a datos inválidos o inconsistentes'
        )
      );
    }
  }

    /**
   * @return array{
   *   sectionId: string,
   *   name: string,
   *   description: string|null,
   *   is_deleted: int,
   *   deleted_at: string|null
   * }
   */
  public function toArray(): array {
    return [
      'id'          => $this->sectionId,
      'name'        => $this->name,
      'description' => $this->description,
      'is_deleted'  => $this->isDeleted,
      'deleted_at'  => $this->deletedAt,
    ];
  }
}