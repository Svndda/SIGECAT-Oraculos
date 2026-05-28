<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateDepartmentDTO
 *
 * Encapsulates and validates the data used to update an existing department.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Ensures the department identifier (department_id) is provided.
 * - Supports partial updates (area_id, name, description are optional).
 * - Validates each field only if it is present in the request.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateDepartmentDTO
{
  public string $departmentId;
  public ?string $areaId;
  public ?string $name;
  public ?string $description;

  private function __construct(
    string $departmentId,
    ?string $areaId,
    ?string $name,
    ?string $description
  ) {
    $this->departmentId = $departmentId;
    $this->areaId = $areaId;
    $this->name = $name;
    $this->description = $description;
  }

  /**
   * @param array{
   *     department_id?: string,
   *     area_id?: string,
   *     name?: string,
   *     description?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['department_id'] ?? ''),
      isset($data['area_id']) ? (string) $data['area_id'] : null,
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['description']) ? (string) $data['description'] : null
    );
  }

  public function validate(): void
  {
    // department_id is required for identifying which department to update.
    if (empty($this->departmentId)) {
      throw new ApiException(ErrorType::missingField('department_id'));
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
          ErrorType::invalidField(
            'name',
            'El nombre del departamento no puede exceder los 110 caracteres'
          )
        );
      }
    }

    // Validate description if it is provided (optional field)
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::invalidField(
          'description',
          'La descripción del departamento no puede exceder los 255 caracteres'
        )
      );
    }

    // Ensure that at least one updatable field is provided.
    if ($this->areaId === null && $this->name === null && $this->description === null) {
      throw new ApiException(ErrorType::invalidDepartmentUpdate());
    }
  }
}