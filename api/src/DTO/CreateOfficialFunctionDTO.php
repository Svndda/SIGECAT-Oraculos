<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateOfficialFunctionDTO
 *
 * Encapsulates and validates the data required to create an official function
 * (OFFICIAL_FUNCTIONS). Each function belongs to exactly one job (JOBS, "tipo
 * de puesto") through job_id, with an optional expected_time (in hours).
 *
 * @package DTO
 */
final class CreateOfficialFunctionDTO
{
  public readonly string $name;
  public readonly ?string $description;
  public readonly string $jobId;
  public readonly ?float $expectedTime;

  private function __construct(
    string $name,
    ?string $description,
    string $jobId,
    ?float $expectedTime
  ) {
    $this->name = $name;
    $this->description = $description;
    $this->jobId = $jobId;
    $this->expectedTime = $expectedTime;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $expected = null;
    if (isset($data['expected_time']) && trim((string) $data['expected_time']) !== '') {
      $expected = (float) $data['expected_time'];
    }

    return new self(
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
      (string) ($data['job_id'] ?? ''),
      $expected,
    );
  }

  public function validate(): void
  {
    if (trim($this->name) === '') {
      throw new ApiException(ErrorType::missingField('name'));
    }
    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_NAME', 'El nombre de la función no puede exceder los 110 caracteres'), 400
      );
    }
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_DESC', 'La descripción no puede exceder los 255 caracteres'), 400
      );
    }
    if (trim($this->jobId) === '') {
      throw new ApiException(ErrorType::missingField('job_id'));
    }
    if ($this->expectedTime !== null && $this->expectedTime < 0) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_EXPECTED_TIME', 'El tiempo esperado no puede ser negativo'), 400
      );
    }
  }
}
