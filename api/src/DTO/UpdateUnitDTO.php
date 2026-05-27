<?php
declare(strict_types=1);
namespace DTO;

use Http\ApiException;
use Http\ErrorType;

final class UpdateUnitDTO {
  public string $unitId;
  public ?string $name;
  public ?string $description;

  // sectionId or departmentId
  public ?string $belongingId;

  private function __construct(string $unitId, ?string $name, 
      ?string $description, ?string $belongingId) {
    $this->unitId = $unitId;
    $this->name = $name;
    $this->description = $description;
    $this->belongingId = $belongingId;
  }

  /**
   * @param array{
   *     unit_id: string,
   *     name?: string,
   *     description?: string,
   *     belonging_id?: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data['unit_id'] ?? ''),
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['description']) ? (string) $data['description'] : null,
      isset($data['belonging_id']) ? (string) $data['belonging_id'] : null
    );
  }

  public function validate(): void {
    // unit_id is required for identifying which unit to update.
    if (empty($this->unitId)) {
      throw new ApiException(ErrorType::missingField('unit_id'));
    }

    // Validate unit_id if it is provided (optional field)
    if ($this->unitId !== null && empty($this->unitId)) {
      throw new ApiException(ErrorType::invalidField('unit_id'));
    }

    // belonging_id is required for identifying which section or department belonging a unit.
    if (empty($this->belongingId)) {
      throw new ApiException(ErrorType::missingField('belonging_id'));
    }

    // Validate belonging_id if it is provided (optional field)
    if ($this->belongingId !== null && empty($this->belonging_id)) {
      throw new ApiException(ErrorType::invalidField('belonging_id'));
    }
    
    // Validate name if it is provided (optional field)
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

    // Validate description if it is provided (optional field)
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UNIT_DESC',
          'La descripción de la unidad no puede exceder los 255 caracteres'
        )
      );
    }

    // Ensure that at least one updatable field is provided.
    if ($this->unitId === null && $this->name === null &&
        $this->description === null && $this->belongingId === null) {
      throw new ApiException(
        ErrorType::from(
        'INVALID_UNIT_UPDATE',
        'No se pudo actualizar la unidad debido a datos inválidos o inconsistentes'
        )
      );
    }    
  }
}