<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

final class CreateJobFunctionDTO
{
  public const ALLOWED_FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];

  public readonly string $declarationId;
  public readonly ?string $officialFunctionId;
  public readonly ?string $customFunctionId;
  public readonly string $frequency;
  public readonly ?string $justification;
  public int $durationMinutes;
  public ?int $overtimeMinutes;

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

  /**
   * @param array<string, mixed> $data
   * @return self
   */
  public static function fromArray(array $data): self
  {
    $opt = static function (string $key) use ($data): ?string {
      if (!isset($data[$key])) {
        return null;
      }
      $value = trim((string) $data[$key]);
      return $value === '' ? null : $value;
    };

    $durationMinutes = isset($data['duration_minutes']) && is_numeric($data['duration_minutes'])
      ? (int) $data['duration_minutes']
      : 0;

    $overtimeMinutes = isset($data['overtime_minutes']) && is_numeric($data['overtime_minutes'])
      ? (int) $data['overtime_minutes']
      : null;

    return new self(
      (string) ($data['declaration_id'] ?? ''),
      $opt('official_function_id'),
      $opt('custom_function_id'),
      isset($data['frequency']) && trim((string) $data['frequency']) !== ''
        ? (string) $data['frequency'] : 'Diario',
      $opt('justification'),
      $durationMinutes,
      $overtimeMinutes
    );
  }

  /**
   * @throws ApiException
   */
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

    if ($this->overtimeMinutes !== null) {
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