<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateJobPositionDTO
 *
 * Encapsulates and validates the data required to create a plaza
 * (JOB_POSITION). A plaza hangs from exactly one parent entity — area,
 * department, section or unit (mirrors the CHECK_JOB_POSITION_PARENT
 * constraint). Its `name` is the "número de plaza".
 *
 * @package DTO
 */
final class CreateJobPositionDTO {
  public readonly string $jobPositionNumber;
  public readonly ?string $description;
  public readonly string $jobId;
  public readonly ?string $areaId;
  public readonly ?string $departmentId;
  public readonly ?string $sectionId;
  public readonly ?string $unitId;

  private function __construct(
    string $jobPositionNumber,
    ?string $description,
    string $jobId,
    ?string $areaId,
    ?string $departmentId,
    ?string $sectionId,
    ?string $unitId
  ) {
    $this->jobPositionNumber = $jobPositionNumber;
    $this->description = $description;
    $this->jobId = $jobId;
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
      (string) ($data['job_position_number'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
      (string) ($data['job_id'] ?? ''),
      $opt('area_id'),
      $opt('department_id'),
      $opt('section_id'),
      $opt('unit_id'),
    );
  }

  /**
   * Returns the [column, id] of the single parent the plaza belongs to.
   * Call after validate(), which guarantees exactly one parent is set.
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

    throw new \LogicException('CreateJobPositionDTO::parent() called without a parent set');
  }

  public function validate(): void {
    if (trim($this->jobPositionNumber) === '') {
      throw new ApiException(ErrorType::missingField('job_position_number'));
    }
    if (strlen($this->jobPositionNumber) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_JOB_POSITION_NUMBER', 'El número de plaza no puede exceder los 110 caracteres'), 400
      );
    }
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_JOB_POSITION_DESC', 'La descripción no puede exceder los 255 caracteres'), 400
      );
    }
    if (trim($this->jobId) === '') {
      throw new ApiException(ErrorType::missingField('job_id'));
    }

    $parentCount = count(array_filter(
      [$this->areaId, $this->departmentId, $this->sectionId, $this->unitId],
      static fn(?string $v): bool => $v !== null
    ));
    if ($parentCount !== 1) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_JOB_POSITION_PARENT',
          'La plaza debe pertenecer exactamente a una entidad (área, departamento, sección o unidad).'
        ), 400
      );
    }
  }
}
