<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateJobFunctionDTO
 *
 * Encapsulates and validates a partial update of a declaration function
 * (JOB_FUNCTIONS). Supported fields: frequency, duration_minutes,
 * overtime_minutes, justification and an optional swap of the referenced
 * function (official XOR custom). The declaration a function belongs to
 * cannot be changed.
 *
 * Cross-field rules (the overtime/justification requirement, CHK_JOB_FUNC_OVER_JUST)
 * depend on the effective values after the merge and are enforced by
 * JobFunctionService against the existing row.
 *
 * @package DTO
 */
final class UpdateJobFunctionDTO
{
  public readonly ?string $frequency;
  public readonly ?string $officialFunctionId;
  public readonly ?string $customFunctionId;
  public readonly bool $officialProvided;
  public readonly bool $customProvided;

  public readonly ?string $justification;
  public readonly bool $justificationProvided;

  /**
   * Requested new duration in minutes, or null when the client did not send
   * this field (meaning: leave it unchanged). Holds the raw scalar until
   * validate() checks its format and normalizes it to a plain int.
   */
  public int|string|null $durationMinutes;

  /**
   * Requested new overtime duration in minutes, or null when the client did
   * not send this field (meaning: leave it unchanged). Same raw-then-
   * normalized handling as durationMinutes. duration_minutes and
   * overtime_minutes are independent fields (not a start/end pair), so each
   * carries its own value without needing a matching "provided" flag.
   */
  public int|string|null $overtimeMinutes;

  private function __construct(
    ?string $frequency,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    bool $officialProvided,
    bool $customProvided,
    ?string $justification,
    bool $justificationProvided,
    int|string|null $durationMinutes,
    int|string|null $overtimeMinutes
  ) {
    $this->frequency = $frequency;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->officialProvided = $officialProvided;
    $this->customProvided = $customProvided;
    $this->justification = $justification;
    $this->justificationProvided = $justificationProvided;
    $this->durationMinutes = $durationMinutes;
    $this->overtimeMinutes = $overtimeMinutes;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $optTrim = static function (string $key) use ($data): ?string {
      if (!isset($data[$key])) {
        return null;
      }
      $value = trim((string) $data[$key]);
      return $value === '' ? null : $value;
    };

    return new self(
      isset($data['frequency']) && trim((string) $data['frequency']) !== '' ? (string) $data['frequency'] : null,
      $optTrim('official_function_id'),
      $optTrim('custom_function_id'),
      array_key_exists('official_function_id', $data),
      array_key_exists('custom_function_id', $data),
      $optTrim('justification'),
      array_key_exists('justification', $data),
      $data['duration_minutes'] ?? null,
      $data['overtime_minutes'] ?? null
    );
  }

  public function validate(): void
  {
    if ($this->frequency !== null
      && !in_array($this->frequency, CreateJobFunctionDTO::ALLOWED_FREQUENCIES, true)) {
      throw new ApiException(
        ErrorType::invalidField(
          'frequency',
          'La frecuencia debe ser una de: ' . implode(', ', CreateJobFunctionDTO::ALLOWED_FREQUENCIES)
        )
      );
    }

    // Only one function reference may be swapped in at a time (XOR is preserved).
    if ($this->officialFunctionId !== null && $this->customFunctionId !== null) {
      throw new ApiException(
        ErrorType::invalidField(
          'official_function_id',
          'Solo puede indicar una función: oficial o personalizada'
        )
      );
    }

    $this->durationMinutes = $this->normalizePositiveInt($this->durationMinutes, 'duration_minutes');
    $this->overtimeMinutes = $this->normalizePositiveInt($this->overtimeMinutes, 'overtime_minutes');

    if ($this->justification !== null && strlen($this->justification) > 255) {
      throw new ApiException(
        ErrorType::invalidField('justification', 'La justificación no puede exceder los 255 caracteres')
      );
    }

    $hasAny = $this->frequency !== null
      || $this->officialProvided
      || $this->customProvided
      || $this->justificationProvided
      || $this->durationMinutes !== null
      || $this->overtimeMinutes !== null;
    if (!$hasAny) {
      throw new ApiException(
        ErrorType::from('NO_UPDATABLE_FIELDS', 'No se proporcionaron campos para actualizar.'), 400
      );
    }
  }

  /**
   * Validates a raw scalar as an optional positive integer field. Returns
   * null when the field was not sent (left unchanged), or the normalized
   * int when it was sent and is a valid positive whole number.
   */
  private function normalizePositiveInt(int|string|null $value, string $field): ?int
  {
    if ($value === null || $value === '') {
      return null;
    }
    if (!is_numeric($value) || (int) $value != $value) {
      throw new ApiException(ErrorType::invalidField($field, 'Debe ser un número entero'));
    }

    $intValue = (int) $value;
    if ($intValue <= 0) {
      throw new ApiException(ErrorType::invalidField($field, 'Debe ser un número entero mayor a 0'));
    }

    return $intValue;
  }
}