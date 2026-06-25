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
 * The overtime and the justification requirement depend on the declaration's
 * shift window, so they are resolved by JobFunctionService.
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

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public readonly ?string $startsAt;
  public readonly ?string $endsAt;
  public readonly bool $startsAtProvided;
  public readonly bool $endsAtProvided;

  private function __construct(
    string $declarationId,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    string $frequency,
    ?string $justification,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->declarationId = $declarationId;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->frequency = $frequency;
    $this->justification = $justification;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
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
      CreateRestTimeDTO::normalizeTimestamp($data['starts_at'] ?? null),
      CreateRestTimeDTO::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
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

    if (!$this->startsAtProvided) {
      throw new ApiException(ErrorType::missingField('starts_at'));
    }
    if ($this->startsAt === null) {
      throw new ApiException(ErrorType::invalidField('starts_at', 'El formato de fecha y hora no es válido'));
    }
    if (!$this->endsAtProvided) {
      throw new ApiException(ErrorType::missingField('ends_at'));
    }
    if ($this->endsAt === null) {
      throw new ApiException(ErrorType::invalidField('ends_at', 'El formato de fecha y hora no es válido'));
    }
    if ($this->endsAt <= $this->startsAt) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }

    if ($this->justification !== null && strlen($this->justification) > 255) {
      throw new ApiException(
        ErrorType::invalidField('justification', 'La justificación no puede exceder los 255 caracteres')
      );
    }
  }
}
