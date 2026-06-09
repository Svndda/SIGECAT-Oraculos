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
 * - Supports partial updates (all fields are optional).
 * - Validates each field only if it is present in the request.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateRestTimeDTO
{
  public ?float $coffeeHours;
  public ?float $lunchHours;
  public ?int $neededTime;
  public ?string $restType;

  private function __construct(
    ?float $coffeeHours,
    ?float $lunchHours,
    ?int $neededTime,
    ?string $restType
  ) {
    $this->coffeeHours = $coffeeHours;
    $this->lunchHours = $lunchHours;
    $this->neededTime = $neededTime;
    $this->restType = $restType;
  }

  /**
   * @param array{
   *     coffee_hours?: int|float|string,
   *     lunch_hours?: int|float|string,
   *     needed_time?: int|string,
   *     rest_type?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['coffee_hours']) ? (float) $data['coffee_hours'] : null,
      isset($data['lunch_hours']) ? (float) $data['lunch_hours'] : null,
      isset($data['needed_time']) ? (int) $data['needed_time'] : null,
      isset($data['rest_type']) ? (string) $data['rest_type'] : null
    );
  }

  public function validate(): void
  {
    // rest_type optional: if provided, must be one of the allowed values.
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

    // coffee_hours optional: if provided, must not be negative.
    if ($this->coffeeHours !== null && $this->coffeeHours < 0) {
      throw new ApiException(
        ErrorType::invalidField('coffee_hours', 'Las horas de café no pueden ser negativas')
      );
    }

    // lunch_hours optional: if provided, must not be negative.
    if ($this->lunchHours !== null && $this->lunchHours < 0) {
      throw new ApiException(
        ErrorType::invalidField('lunch_hours', 'Las horas de almuerzo no pueden ser negativas')
      );
    }

    // needed_time optional: if provided, must be between 0 and 120 minutes.
    if ($this->neededTime !== null && ($this->neededTime < 0 || $this->neededTime > 120)) {
      throw new ApiException(
        ErrorType::invalidField('needed_time', 'El tiempo necesario no puede exceder los 120 minutos')
      );
    }

    // Ensure that at least one updatable field is provided.
    if (
      $this->coffeeHours === null
      && $this->lunchHours === null
      && $this->neededTime === null
      && $this->restType === null
    ) {
      throw new ApiException(
        ErrorType::invalidField('rest_time', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
  }
}
