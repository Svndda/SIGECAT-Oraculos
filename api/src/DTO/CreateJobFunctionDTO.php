<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateJobFunctionDTO
 *
 * Encapsulates and validates the data required to add a function to a
 * declaration (JOB_FUNCTIONS). The owner (user_id) and the job_position_id are
 * derived from the target declaration, never from the payload. Exactly one of
 * official_function_id / custom_function_id must be provided (XOR).
 *
 * overtime_minutes is optional ("¿Es tiempo extra?" + how many minutes). Unlike
 * an update, every field here is known up front - there is no existing row to
 * merge against - so the overtime/justification requirement
 * (CHK_JOB_FUNC_OVER_JUST: overtime_minutes set => justification required) is
 * enforced directly by this DTO instead of being deferred to the service.
 *
 * @package DTO
 */
final class CreateJobFunctionDTO
{
  /** Allowed frequency values, matching the FREQUENCY check constraint. */
  public const ALLOWED_FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];

  public readonly string $declarationId;
  public readonly ?string $officialFunctionId;
  public readonly ?string $customFunctionId;
  public readonly string $frequency;
  public readonly ?string $justification;
  public int $durationMinutes;
  public int $overtimeMinutes;

  private function __construct(
    string $declarationId,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    string $frequency,
    ?string $justification,
    int $durationMinutes,
    ?int $overtimeMinutes
  ) {
    $this->declarationId = $declarationId;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->frequency = $frequency;
    $this->justification = $justification;
    $this->durationMinutes = $durationMinutes;
    $this->overtimeMinutes = $overtimeMinutes;
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
      (string) ($data['declaration_id'] ?? ''),
      $opt('official_function_id'),
      $opt('custom_function_id'),
      isset($data['frequency']) && trim((string) $data['frequency']) !== ''
        ? (string) $data['frequency'] : 'Diario',
      $opt('justification'),
      $data['duration_minutes'] ?? null,
      $data['overtime_minutes'] ?? null
    );
  }

  public function validate(): void
  {
    if (trim($this->declarationId) === '') {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }

    $hasOfficial = $this->officialFunctionId !== null;
    $hasCustom = $this->customFunctionId !== null;
    if ($hasOfficial === $hasCustom) {
      throw new ApiException(
        ErrorType::invalidField(
          'official_function_id',
          'Debe indicar exactamente una función: oficial o personalizada'
        )
      );
    }

    if (!in_array($this->frequency, self::ALLOWED_FREQUENCIES, true)) {
      throw new ApiException(
        ErrorType::invalidField(
          'frequency',
          'La frecuencia debe ser una de: ' . implode(', ', self::ALLOWED_FREQUENCIES)
        )
      );
    }

    if ($this->durationMinutes <= 0) {
      throw new ApiException(
        ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero mayor a 0')
      );
    }

    if ($this->justification !== null && strlen($this->justification) > 255) {
      throw new ApiException(
        ErrorType::invalidField('justification', 'La justificación no puede exceder los 255 caracteres')
      );
    }

    if ($this->overtimeMinutes !== null && $this->overtimeMinutes !== '') {
      if (!is_numeric($this->overtimeMinutes) || (int) $this->overtimeMinutes != $this->overtimeMinutes) {
        throw new ApiException(
          ErrorType::invalidField('overtime_minutes', 'El tiempo extra debe ser un número entero')
        );
      }
      $this->overtimeMinutes = (int) $this->overtimeMinutes;
      if ($this->overtimeMinutes <= 0) {
        throw new ApiException(
          ErrorType::invalidField('overtime_minutes', 'El tiempo extra debe ser un número entero mayor a 0')
        );
      }

      if ($this->justification === null) {
        throw new ApiException(
          ErrorType::invalidField('justification', 'Debe justificar el tiempo extra reportado')
        );
      }
    }
  }
}