<?php

declare(strict_types=1);

namespace DTO;

use Exception;
use Http\ApiException;
use Http\ErrorType;
use DateTime;
use DateTimeInterface;

/**
 * CreateDeclarationDTO
 *
 * Data transfer object for creating a new declaration.
 * Encapsulates and validates the required fields: job_position_id, shift_starts_at,
 * and shift_ends_at. The dates are expected in a format parseable by DateTime.
 *
 * @package DTO
 */
final class CreateDeclarationDTO
{
  /**
   * ID of the job position for which the declaration is made.
   *
   * @var string
   */
  public string $jobPositionId;

  /**
   * Start timestamp of the shift.
   *
   * @var DateTimeInterface
   */
  public DateTimeInterface $shiftStartsAt;

  /**
   * End timestamp of the shift.
   *
   * @var DateTimeInterface
   */
  public DateTimeInterface $shiftEndsAt;

  /**
   * Private constructor; use fromArray().
   *
   * @param string $jobPositionId
   * @param DateTimeInterface $shiftStartsAt
   * @param DateTimeInterface $shiftEndsAt
   */
  private function __construct(
    string $jobPositionId,
    DateTimeInterface $shiftStartsAt,
    DateTimeInterface $shiftEndsAt
  ) {
    $this->jobPositionId = $jobPositionId;
    $this->shiftStartsAt = $shiftStartsAt;
    $this->shiftEndsAt = $shiftEndsAt;
  }

  /**
   * Creates a DTO from an associative array.
   *
   * The array must contain keys: job_position_id, shift_starts_at, shift_ends_at.
   * Dates are parsed using DateTime; if parsing fails or a field is missing,
   * an ApiException is thrown.
   *
   * @param array<string, mixed> $data Input data.
   * @return self
   * @throws ApiException If any required field is missing or has invalid format.
   */
  public static function fromArray(array $data): self
  {
    if (!isset($data['shift_starts_at'])) {
      throw new ApiException(ErrorType::missingField('shift_starts_at'));
    }
    if (!isset($data['shift_ends_at'])) {
      throw new ApiException(ErrorType::missingField('shift_ends_at'));
    }

    try {
      $shiftStartsAt = new DateTime($data['shift_starts_at']);
      $shiftEndsAt   = new DateTime($data['shift_ends_at']);
    } catch (Exception $e) {
      throw new ApiException(
        ErrorType::invalidField(
          'shift_starts_at',
          'Formato de fecha inválido'
        )
      );
    }

    return new self(
      (string) ($data['job_position_id'] ?? ''),
      $shiftStartsAt,
      $shiftEndsAt
    );
  }

  /**
   * Validates the DTO fields.
   *
   * Checks that all fields are present and shift_ends_at is after shift_starts_at.
   *
   * @throws ApiException If any field is missing or shift_ends_at is not after shift_starts_at.
   */
  public function validate(): void
  {
    if (empty($this->jobPositionId)) {
      throw new ApiException(ErrorType::missingField('job_position_id'));
    }
    if ($this->shiftEndsAt <= $this->shiftStartsAt) {
      throw new ApiException(
        ErrorType::invalidField(
          'shift_ends_at',
          'El final de la jornada debe ser después de su inicio'
        )
      );
    }
  }
}