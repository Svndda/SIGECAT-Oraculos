<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateRestTimeDTO
 *
 * Encapsulates and validates the data required to register a new rest time
 * entry within a declaration.
 *
 * The owner (user_id) is taken from the authenticated request, never from the
 * payload.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: declaration_id, rest_type, duration_minutes.
 * - Ensures rest_type is one of the allowed values.
 * - Ensures duration_minutes is a positive integer within the maximum
 *   duration allowed for the rest type (mirrors the CHK_REST_TIMES_DURATION
 *   database constraint: Coffee <= 30 min, the rest <= 60 min).
 *
 * @package DTO
 */
final class CreateRestTimeDTO
{
  /** Allowed rest type values, matching the REST_TYPE check constraint. */
  public const ALLOWED_REST_TYPES = ['Breakfast', 'Coffee', 'Dinner', 'Lunch'];

  /** Maximum duration, in minutes, allowed per rest type. */
  private const MAX_MINUTES = ['Coffee' => 30, 'Breakfast' => 60, 'Dinner' => 60, 'Lunch' => 60];

  public string $declarationId;
  public string $restType;
  public int $durationMinutes;

  private function __construct(
    string $declarationId,
    string $restType,
    int $durationMinutes
  ) {
    $this->declarationId = $declarationId;
    $this->restType = $restType;
    $this->durationMinutes = $durationMinutes;
  }

  /**
   * @param array{
   *     declaration_id?: string,
   *     rest_type?: string,
   *     duration_minutes?: int|string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['declaration_id'] ?? ''),
      isset($data['rest_type']) ? (string) $data['rest_type'] : null,
      $data['duration_minutes'] ?? null
    );
  }

  /** Maximum duration, in minutes, allowed for the given rest type. */
  public static function maxMinutesFor(string $restType): int
  {
    return self::MAX_MINUTES[$restType] ?? 60;
  }

  public function validate(): void
  {
    if ($this->declarationId === '') {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }

    if ($this->restType === '') {
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

    if ($this->durationMinutes <= 0) {
      throw new ApiException(
        ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero mayor a 0')
      );
    }

    $maxMinutes = self::maxMinutesFor($this->restType);
    if ($this->durationMinutes > $maxMinutes) {
      throw new ApiException(
        ErrorType::invalidField(
          'duration_minutes',
          "La duración del descanso '{$this->restType}' no puede exceder los {$maxMinutes} minutos"
        )
      );
    }
  }
}