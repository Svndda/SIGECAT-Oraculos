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
 * - Validates required fields: unit_id, name and belonging_id.
 * - Ensures name does not exceed 110 characters and description does not exceed 255.
 *
 * @package DTO
 */
final class CreateUnitDTO {
  public string $name;
  public ?string $description;

   // sectionId or departmentId
  public string $belongingId;

  private function __construct(string $name,
      ?string $description, string $belongingId) {
    $this->name = $name;
    $this->description = $description;
    $this->belongingId = $belongingId;
  }

  /**
   * @param array{
   *     name?: string,
   *     description?: string
   *     belonging?: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self (
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
      (string) ($data['belonging_id'] ?? ''),
    );
  }

  public function validate(): void {
    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }

    if (strlen($this->name) > 110) {
      throw new ApiException(ErrorType::from('INVALID_UNIT_NAME', 'El nombre de la unidad no puede exceder los 110 caracteres'));
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(ErrorType::from('INVALID_UNIT_DESC', 'La descripción de la unidad no puede exceder los 255 caracteres'));
    }

    // A unit must be assigned to a department or a section.
    if (empty($this->belongingId)) {
      throw new ApiException(ErrorType::missingField('belongingId'));
    }
  }
}
