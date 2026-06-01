<?php
declare(strict_types= 1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateSectionDTO
 *
 * Encapsulates and validates the data required to create a new section.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: area_id, name.
 * - Ensures name does not exceed 110 characters and description does not exceed 255.
 *
 * @package DTO
 */
final class CreateSectionDTO {
  public string $name;
  public ?string $description;
  public string $areaId;

  private function __construct(string $name, ?string $description,
      string $areaId) {
    $this->name = $name;
    $this->description = $description;
    $this->areaId = $areaId;
  }

  /**
   * @param array{
   *     name?: string,
   *     description?: string,
   *     area_id?: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
      (string) ($data['area_id'] ?? '')
    );
  }

    public function validate(): void {
    // area_id is required and must not be empty
    if (empty($this->areaId)) {
      throw new ApiException(ErrorType::missingField('area_id'));
    }

    // Obligatory name: must not be empty and max length 110
    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }
    
    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_SECT_NAME',
          'El nombre de la sección no puede exceder los 110 caracteres'
        )
      );
    }

    // description optional: if provided, maximum length is 255
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('
          INVALID_SECT_DESC', 
          'La descripción de la sección no puede exceder los 255 caracteres'
        )
      );
    }
  }
}