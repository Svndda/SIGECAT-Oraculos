<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateRestTimeDTO
 *
 * Encapsulates and validates the data required to register a new rest time
 * entry for a user.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: user_id, rest_type.
 * - Ensures rest_type is one of the allowed values.
 * - Ensures needed_time does not exceed 120 minutes.
 *
 * @package DTO
 */
final class CreateRestTimeDTO
{
  /** Allowed rest type values, matching the REST_TYPE check constraint. */
  public const ALLOWED_REST_TYPES = ['Coffee', 'Lunch', 'Breakfast', 'Dinner'];

  public string $userId;
  public ?float $coffeeHours;
  public ?float $lunchHours;
  public ?int $neededTime;
  public ?string $restType;

  private function __construct(
    string $userId,
    ?float $coffeeHours,
    ?float $lunchHours,
    ?int $neededTime,
    ?string $restType
  ) {
    $this->userId = $userId;
    $this->coffeeHours = $coffeeHours;
    $this->lunchHours = $lunchHours;
    $this->neededTime = $neededTime;
    $this->restType = $restType;
  }

  /**
   * @param array{
   *     user_id?: string,
   *     coffee_hours?: int|float|string,
   *     lunch_hours?: int|float|string,
   *     needed_time?: int|string,
   *     rest_type?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['user_id'] ?? ''),
      isset($data['coffee_hours']) ? (float) $data['coffee_hours'] : null,
      isset($data['lunch_hours']) ? (float) $data['lunch_hours'] : null,
      isset($data['needed_time']) ? (int) $data['needed_time'] : null,
      isset($data['rest_type']) ? (string) $data['rest_type'] : null
    );
  }

  public function validate(): void
  {
    // user_id is required and must not be empty.
    if (empty($this->userId)) {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    // rest_type is required and must be one of the allowed values.
    if ($this->restType === null || $this->restType === '') {
      throw new ApiException(ErrorType::missingField('rest_type'));
    }
    if (!in_array($this->restType, self::ALLOWED_REST_TYPES, true)) {
      throw new ApiException(
        ErrorType::invalidField(
          'rest_type',
          'El tipo de descanso debe ser uno de: ' . implode(', ', self::ALLOWED_REST_TYPES)
        )
      );
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
  }
}
