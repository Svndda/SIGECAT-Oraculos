<?php
declare(strict_types=1);
namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateUnitDTO
 *
 * Encapsulates and validates the data used to update an existing unit.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates (name, description, section_id, department_id are optional).
 * - Validates each field only if it is present in the request.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateUnitDTO {
  public ?string $name;
  public ?string $description;
  public ?string $sectionId;
  public ?string $departmentId;

  private function __construct(?string $name,
      ?string $description, ?string $sectionId, ?string $departmentId) {
    $this->name         = $name;
    $this->description  = $description;
    $this->sectionId    = $sectionId;
    $this->departmentId = $departmentId;
  }

  /**
   * @param array{
   *     name?: string,
   *     description?: string,
   *     section_id?: string,
   *     department_id?: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self(
      isset($data['name'])          ? (string) $data['name']          : null,
      isset($data['description'])   ? (string) $data['description']   : null,
      isset($data['section_id'])    ? (string) $data['section_id']    : null,
      isset($data['department_id']) ? (string) $data['department_id'] : null
    );
  }

  public function validate(): void {
    // Validate name if provided.
    if ($this->name !== null) {
      if (empty($this->name)) {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::from(
            'INVALID_UNIT_NAME',
            'El nombre de la unidad no puede exceder los 110 caracteres'
          )
        );
      }
    }

    // Validate description if provided.
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_DESC',
          'La descripción de la unidad no puede exceder los 255 caracteres'
        )
      );
    }

    // Ensure at least one updatable field is present.
    if ($this->name === null && $this->description === null &&
        $this->sectionId === null && $this->departmentId === null) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_UPDATE',
          'No se pudo actualizar la unidad debido a datos inválidos o inconsistentes'
        )
      );
    }
  }
}