<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateLicenseDTO
 *
 * Encapsulates and validates the data used to update an existing declared
 * license (LICENSE_TIMES).
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Supports partial updates (license_type_id and duration_minutes are both
 *   optional).
 * - Validates the format of each field only when it is present.
 * - At least one updatable field must be provided.
 *
 * @package DTO
 */
final class UpdateLicenseDTO
{
  public ?string $licenseTypeId;

  /**
   * Requested new duration in minutes, or null when the client did not send
   * this field at all (meaning: leave it unchanged). Holds the raw scalar
   * until validate() checks its format and normalizes it to a plain int.
   */
  public int|string|null $durationMinutes;

  private function __construct(
    ?string $licenseTypeId,
    int|string|null $durationMinutes
  ) {
    $this->licenseTypeId = $licenseTypeId;
    $this->durationMinutes = $durationMinutes;
  }

  /**
   * @param array{
   *     license_type_id?: string,
   *     duration_minutes?: int|string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['license_type_id']) ? (string) $data['license_type_id'] : null,
      $data['duration_minutes'] ?? null
    );
  }

  public function validate(): void
  {
    if ($this->licenseTypeId !== null && trim($this->licenseTypeId) === '') {
      throw new ApiException(ErrorType::invalidField('license_type_id'));
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

    if ($this->licenseTypeId === null && $this->durationMinutes === null) {
      throw new ApiException(
        ErrorType::invalidField('license', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
  }
}