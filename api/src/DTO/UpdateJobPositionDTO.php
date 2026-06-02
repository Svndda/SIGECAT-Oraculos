<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateJobPositionDTO
 *
 * Encapsulates and validates a partial update of a plaza (JOB_POSITION).
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates: name, description, job_position_type_id and the
 *   parent entity are all optional.
 * - When any parent column is present, exactly one must be set (mirrors the
 *   CHECK_JOB_POSITION_PARENT constraint); the repository then clears the other
 *   three so the plaza always hangs from a single entity.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateJobPositionDTO {
  public readonly ?string $jobPositionNumber;
  public readonly ?string $name;
  public readonly ?string $description;
  public readonly ?string $jobPositionTypeId;
  public readonly ?string $areaId;
  public readonly ?string $departmentId;
  public readonly ?string $sectionId;
  public readonly ?string $unitId;

  private function __construct(
    ?string $jobPositionNumber,
    ?string $name,
    ?string $description,
    ?string $jobPositionTypeId,
    ?string $areaId,
    ?string $departmentId,
    ?string $sectionId,
    ?string $unitId
  ) {
    $this->jobPositionNumber = $jobPositionNumber;
    $this->name = $name;
    $this->description = $description;
    $this->jobPositionTypeId = $jobPositionTypeId;
    $this->areaId = $areaId;
    $this->departmentId = $departmentId;
    $this->sectionId = $sectionId;
    $this->unitId = $unitId;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self {
    $opt = static function (string $key) use ($data): ?string {
      if (!isset($data[$key])) {
        return null;
      }
      $value = trim((string) $data[$key]);
      return $value === '' ? null : $value;
    };

    return new self(
      $opt('job_position_number'),
      isset($data['name'])        ? (string) $data['name']        : null,
      isset($data['description']) ? (string) $data['description'] : null,
      $opt('job_position_type_id'),
      $opt('area_id'),
      $opt('department_id'),
      $opt('section_id'),
      $opt('unit_id'),
    );
  }

  /** Whether the update is changing the plaza's parent entity. */
  public function hasParent(): bool {
    return $this->areaId !== null
      || $this->departmentId !== null
      || $this->sectionId !== null
      || $this->unitId !== null;
  }

  /**
   * Returns the [column, id] of the single parent the plaza is moving to.
   * Call only when hasParent() is true (guaranteed exactly one by validate()).
   *
   * @return array{0: string, 1: string}
   */
  public function parent(): array {
    foreach ([
      'area_id'       => $this->areaId,
      'department_id' => $this->departmentId,
      'section_id'    => $this->sectionId,
      'unit_id'       => $this->unitId,
    ] as $column => $id) {
      if ($id !== null) {
        return [$column, $id];
      }
    }

    throw new \LogicException('UpdateJobPositionDTO::parent() called without a parent set');
  }

  public function validate(): void {
    if ($this->jobPositionNumber !== null) {
      if (trim($this->jobPositionNumber) === '') {
        throw new ApiException(ErrorType::invalidField('job_position_number'));
      }
      if (strlen($this->jobPositionNumber) > 110) {
        throw new ApiException(
          ErrorType::from('INVALID_JOB_POSITION_NUMBER', 'El número de plaza no puede exceder los 110 caracteres'), 400
        );
      }
    }
    if ($this->name !== null) {
      if (trim($this->name) === '') {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::from('INVALID_JOB_POSITION_NAME', 'El nombre de la plaza no puede exceder los 110 caracteres'), 400
        );
      }
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_JOB_POSITION_DESC', 'La descripción no puede exceder los 255 caracteres'), 400
      );
    }

    $parentCount = count(array_filter(
      [$this->areaId, $this->departmentId, $this->sectionId, $this->unitId],
      static fn(?string $v): bool => $v !== null
    ));
    if ($parentCount > 1) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_JOB_POSITION_PARENT',
          'La plaza debe pertenecer exactamente a una entidad (área, departamento, sección o unidad).'
        ), 400
      );
    }

    $hasAny = $this->jobPositionNumber !== null
      || $this->name !== null
      || $this->description !== null
      || $this->jobPositionTypeId !== null
      || $parentCount === 1;
    if (!$hasAny) {
      throw new ApiException(
        ErrorType::from('NO_UPDATABLE_FIELDS', 'No se proporcionaron campos para actualizar.'), 400
      );
    }
  }
}
