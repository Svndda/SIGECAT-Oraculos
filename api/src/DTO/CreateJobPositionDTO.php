<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateJobPositionDTO
 *
 * Encapsulates and validates the data required to create a plaza
 * (JOB_POSITION). For now a plaza is attached to an Area; its `name` is the
 * "número de plaza".
 *
 * @package DTO
 */
final class CreateJobPositionDTO {
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $jobPositionTypeId;
  public readonly string $areaId;

  private function __construct(
    string $name,
    ?string $description,
    string $jobPositionTypeId,
    string $areaId
  ) {
    $this->name = $name;
    $this->description = $description;
    $this->jobPositionTypeId = $jobPositionTypeId;
    $this->areaId = $areaId;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
      (string) ($data['job_position_type_id'] ?? ''),
      (string) ($data['area_id'] ?? ''),
    );
  }

  public function validate(): void {
    if (trim($this->name) === '') {
      throw new ApiException(ErrorType::missingField('name'));
    }
    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_PLAZA_NAME', 'El número de plaza no puede exceder los 110 caracteres')
      );
    }
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_PLAZA_DESC', 'La descripción no puede exceder los 255 caracteres')
      );
    }
    if (trim($this->jobPositionTypeId) === '') {
      throw new ApiException(ErrorType::missingField('job_position_type_id'));
    }
    if (trim($this->areaId) === '') {
      throw new ApiException(ErrorType::missingField('area_id'));
    }
  }
}
