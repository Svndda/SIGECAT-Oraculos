<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateJobFunctionDTO
 *
 * Encapsulates and validates a partial update of a declaration function
 * (JOB_FUNCTIONS). Supported fields: frequency, starts_at, ends_at,
 * justification and an optional swap of the referenced function (official XOR
 * custom). The declaration a function belongs to cannot be changed.
 *
 * Cross-field rules (range ordering, overtime and the justification
 * requirement) depend on the declaration's shift window and are enforced by
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

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public readonly ?string $startsAt;
  public readonly ?string $endsAt;
  public readonly bool $startsAtProvided;
  public readonly bool $endsAtProvided;

  private function __construct(
    ?string $frequency,
    ?string $officialFunctionId,
    ?string $customFunctionId,
    bool $officialProvided,
    bool $customProvided,
    ?string $justification,
    bool $justificationProvided,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->frequency = $frequency;
    $this->officialFunctionId = $officialFunctionId;
    $this->customFunctionId = $customFunctionId;
    $this->officialProvided = $officialProvided;
    $this->customProvided = $customProvided;
    $this->justification = $justification;
    $this->justificationProvided = $justificationProvided;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
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
      CreateRestTimeDTO::normalizeTimestamp($data['starts_at'] ?? null),
      CreateRestTimeDTO::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
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

    if ($this->startsAtProvided && $this->startsAt === null) {
      throw new ApiException(ErrorType::invalidField('starts_at', 'El formato de fecha y hora no es válido'));
    }
    if ($this->endsAtProvided && $this->endsAt === null) {
      throw new ApiException(ErrorType::invalidField('ends_at', 'El formato de fecha y hora no es válido'));
    }

    if ($this->justification !== null && strlen($this->justification) > 255) {
      throw new ApiException(
        ErrorType::invalidField('justification', 'La justificación no puede exceder los 255 caracteres')
      );
    }

    $hasAny = $this->frequency !== null
      || $this->officialProvided
      || $this->customProvided
      || $this->justificationProvided
      || $this->startsAtProvided
      || $this->endsAtProvided;
    if (!$hasAny) {
      throw new ApiException(
        ErrorType::from('NO_UPDATABLE_FIELDS', 'No se proporcionaron campos para actualizar.'), 400
      );
    }
  }
}
