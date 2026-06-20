<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateJobPositionDTO
 *
 * Encapsulates and validates a partial update of a JobPosition.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates: name, description, job_id, user_id, shift and the
 * parent entity are all optional.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateJobPositionDTO
{
  public readonly ?string $jobPositionNumber;
  public readonly ?string $description;
  public readonly ?string $jobId;
  public readonly ?string $userId;
  public readonly ?string $shift;
  public readonly ?string $areaId;
  public readonly ?string $departmentId;
  public readonly ?string $sectionId;
  public readonly ?string $unitId;

  private function __construct(
    ?string $jobPositionNumber,
    ?string $description,
    ?string $jobId,
    ?string $userId,
    ?string $shift,
    ?string $areaId,
    ?string $departmentId,
    ?string $sectionId,
    ?string $unitId
  ) {
    $this->jobPositionNumber = $jobPositionNumber;
    $this->description = $description;
    $this->jobId = $jobId;
    $this->userId = $userId;
    $this->shift = $shift;
    $this->areaId = $areaId;
    $this->departmentId = $departmentId;
    $this->sectionId = $sectionId;
    $this->unitId = $unitId;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $opt = static function (string $key) use ($data): ?string {
      if (!isset($data[$key])) {
        return null;
      }
      $value = trim((string) $data[$key]);
      return $value === '' ? null : $value;
    };

    return new self(
      isset($data['job_position_number'])
        ? (string) $data['job_position_number'] : null,
      isset($data['description']) ? (string) $data['description'] : null,
      $opt('job_id'),
      $opt('user_id'),
      $opt('job_shift'),
      $opt('area_id'),
      $opt('department_id'),
      $opt('section_id'),
      $opt('unit_id'),
    );
  }

  /** Whether the update is changing the job positions's parent entity. */
  public function hasParent(): bool
  {
    return $this->areaId !== null
      || $this->departmentId !== null
      || $this->sectionId !== null
      || $this->unitId !== null;
  }

  /**
   * Returns the [column, id] of the single parent the job positions is moving to.
   * Call only when hasParent() is true (guaranteed exactly one by validate()).
   *
   * @return array{0: string, 1: string}
   */
  public function parent(): array
  {
    foreach ([
      'area_id' => $this->areaId,
      'department_id' => $this->departmentId,
      'section_id' => $this->sectionId,
      'unit_id' => $this->unitId,
    ] as $column => $id) {
      if ($id !== null) {
        return [$column, $id];
      }
    }

    throw new ApiException(ErrorType::invalidJson());
  }

  public function validate(): void
  {
    if ($this->jobPositionNumber !== null) {
      if (trim($this->jobPositionNumber) === '') {
        throw new ApiException(ErrorType::invalidField('job_position_number'));
      }
      if (strlen($this->jobPositionNumber) > 110) {
        throw new ApiException(
          ErrorType::from(
            'INVALID_JOB_POSITION_NUMBER',
            'El número de plaza no puede exceder los 110 caracteres'
          ),
          400
        );
      }
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_JOB_POSITION_DESC',
          'La descripción no puede exceder los 255 caracteres'
        ),
        400
      );
    }

    if ($this->shift !== null) {
      $validShifts = [
        'Diurna',
        'Media Diurna',
        'Mixta',
        'Nocturna',
        'Media Nocturna'
      ];
      if (!in_array($this->shift, $validShifts, true)) {
        throw new ApiException(
          ErrorType::from('INVALID_SHIFT', 'El turno asignado no es válido.'),
          400
        );
      }
    }

    $parentCount = count(array_filter(
      [$this->areaId, $this->departmentId, $this->sectionId, $this->unitId],
      static fn(?string $v): bool => $v !== null
    ));
    if ($parentCount > 1) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_JOB_POSITION_PARENT',
          'La plaza debe pertenecer exactamente a una entidad (
            área, departamento, sección o unidad
          ).'
        ),
        400
      );
    }

    $hasAny = $this->jobPositionNumber !== null
      || $this->description !== null
      || $this->jobId !== null
      || $this->userId !== null
      || $this->shift !== null
      || $parentCount === 1;
    if (!$hasAny) {
      throw new ApiException(
        ErrorType::from(
          'NO_UPDATABLE_FIELDS',
          'No se proporcionaron campos para actualizar.'
        ),
        400
      );
    }
  }
}