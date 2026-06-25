<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateOfficialFunctionDTO
 *
 * Encapsulates and validates a partial update of an official function
 * (OFFICIAL_FUNCTIONS).
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates: name, description, job_id and expected_time are
 *   all optional.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateOfficialFunctionDTO
{
  public readonly ?string $name;
  public readonly ?string $description;
  public readonly ?string $jobId;
  public readonly ?float $expectedTime;
  public readonly bool $expectedTimeProvided;

  private function __construct(
    ?string $name,
    ?string $description,
    ?string $jobId,
    ?float $expectedTime,
    bool $expectedTimeProvided
  ) {
    $this->name = $name;
    $this->description = $description;
    $this->jobId = $jobId;
    $this->expectedTime = $expectedTime;
    $this->expectedTimeProvided = $expectedTimeProvided;
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

    $expectedProvided = array_key_exists('expected_time', $data);
    $expected = null;
    if ($expectedProvided && trim((string) $data['expected_time']) !== '') {
      $expected = (float) $data['expected_time'];
    }

    return new self(
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['description']) ? (string) $data['description'] : null,
      $opt('job_id'),
      $expected,
      $expectedProvided,
    );
  }

  public function validate(): void
  {
    if ($this->name !== null) {
      if (trim($this->name) === '') {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::from('INVALID_FUNCTION_NAME', 'El nombre de la función no puede exceder los 110 caracteres'), 400
        );
      }
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_DESC', 'La descripción no puede exceder los 255 caracteres'), 400
      );
    }

    if ($this->expectedTime !== null && $this->expectedTime < 0) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_EXPECTED_TIME', 'El tiempo esperado no puede ser negativo'), 400
      );
    }

    $hasAny = $this->name !== null
      || $this->description !== null
      || $this->jobId !== null
      || $this->expectedTimeProvided;
    if (!$hasAny) {
      throw new ApiException(
        ErrorType::from('NO_UPDATABLE_FIELDS', 'No se proporcionaron campos para actualizar.'), 400
      );
    }
  }
}
