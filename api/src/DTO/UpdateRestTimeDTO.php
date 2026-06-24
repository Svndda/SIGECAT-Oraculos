<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateRestTimeDTO
 *
 * Encapsulates and validates the data used to update an existing rest time
 * entry.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates (rest_type, starts_at, ends_at are all optional).
 * - Validates the format of each field only when it is present.
 * - At least one updatable field must be provided.
 *
 * The cross-field rules (ends_at after starts_at and the per-type maximum
 * duration) depend on the effective values after the merge, so they are
 * enforced by RestTimeService against the existing row.
 *
 * @package DTO
 */
final class UpdateRestTimeDTO
{
  public ?string $restType;
  public bool $startsAtProvided;
  public bool $endsAtProvided;

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public ?string $startsAt;
  public ?string $endsAt;

  private function __construct(
    ?string $restType,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->restType = $restType;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
  }

  /**
   * @param array{
   *     rest_type?: string,
   *     starts_at?: string,
   *     ends_at?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['rest_type']) ? (string) $data['rest_type'] : null,
      CreateRestTimeDTO::normalizeTimestamp($data['starts_at'] ?? null),
      CreateRestTimeDTO::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
    );
  }

  public function validate(): void
  {
    if ($this->restType !== null) {
      if ($this->restType === '') {
        throw new ApiException(ErrorType::invalidField('rest_type'));
      }
      if (!in_array($this->restType, CreateRestTimeDTO::ALLOWED_REST_TYPES, true)) {
        throw new ApiException(
          ErrorType::invalidField(
            'rest_type',
            'El tipo de descanso debe ser uno de: '
              . implode(', ', CreateRestTimeDTO::ALLOWED_REST_TYPES)
          )
        );
      }
    }

    if ($this->startsAtProvided && $this->startsAt === null) {
      throw new ApiException(
        ErrorType::invalidField('starts_at', 'El formato de fecha y hora no es válido')
      );
    }
    if ($this->endsAtProvided && $this->endsAt === null) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'El formato de fecha y hora no es válido')
      );
    }

    if ($this->restType === null && !$this->startsAtProvided && !$this->endsAtProvided) {
      throw new ApiException(
        ErrorType::invalidField('rest_time', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
  }
}
