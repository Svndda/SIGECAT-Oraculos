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
 * - Supports partial updates (rest_type and duration_minutes are both
 *   optional).
 * - Validates the format of each field only when it is present.
 * - At least one updatable field must be provided.
 *
 * The per-type maximum duration depends on the effective rest_type after the
 * merge, so it is enforced by RestTimeService against the existing row.
 *
 * @package DTO
 */
final class UpdateRestTimeDTO
{
  public ?string $restType;

  /**
   * Requested new duration in minutes, or null when the client did not send
   * this field at all (meaning: leave it unchanged). Holds the raw scalar
   * until validate() checks its format and normalizes it to a plain int.
   */
  public int|string|null $durationMinutes;

  private function __construct(
    ?string $restType,
    int|string|null $durationMinutes
  ) {
    $this->restType = $restType;
    $this->durationMinutes = $durationMinutes;
  }

  /**
   * @param array{
   *     rest_type?: string,
   *     duration_minutes?: int|string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['rest_type']) ? (string) $data['rest_type'] : null,
      $data['duration_minutes'] ?? null
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

    if ($this->durationMinutes !== null && $this->durationMinutes !== '') {
      if (!is_numeric($this->durationMinutes) || (int) $this->durationMinutes != $this->durationMinutes) {
        throw new ApiException(
          ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero')
        );
      }

      $this->durationMinutes = (int) $this->durationMinutes;

      if ($this->durationMinutes <= 0) {
        throw new ApiException(
          ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero mayor a 0')
        );
      }
    } else {
      $this->durationMinutes = null;
    }

    if ($this->restType === null && $this->durationMinutes === null) {
      throw new ApiException(
        ErrorType::invalidField('rest_time', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
  }
}