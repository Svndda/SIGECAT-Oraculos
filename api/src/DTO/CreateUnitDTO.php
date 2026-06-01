<?php
declare(strict_types= 1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateUnitDTO
 *
 * Encapsulates and validates the data required to create a new unit.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: name, and at least one of section_id or department_id.
 * - Ensures name does not exceed 110 characters and description does not exceed 255.
 *
 * @package DTO
 */
final class CreateUnitDTO {
  public string $name;
  public ?string $description;
  public ?string $sectionId;
  public ?string $departmentId;

  private function __construct(string $name,
      ?string $description, ?string $sectionId, ?string $departmentId) {
    $this->name = $name;
    $this->description = $description;
    $this->sectionId = $sectionId;
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
    return new self (
      (string) ($data['name'] ?? ''),
      isset($data['description'])   ? (string) $data['description']   : null,
      isset($data['section_id'])    ? (string) $data['section_id']    : null,
      isset($data['department_id']) ? (string) $data['department_id'] : null
    );
  }

  public function validate(): void {
    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }

    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_NAME',
          'El nombre de la unidad no puede exceder los 110 caracteres'
        )
      );
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_DESC',
          'La descripción de la unidad no puede exceder los 255 caracteres'
        )
      );
    }

    // A unit must be assigned to at least one of: department or section.
    if ($this->departmentId === null && $this->sectionId === null) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_ASSIGNMENT',
          'La unidad debe estar asignada a un departamento o una sección'
        )
      );
    }
  }
}
