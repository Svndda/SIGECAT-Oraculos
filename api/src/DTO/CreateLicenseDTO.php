<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateLicenseDTO
 *
 * Encapsulates and validates the data required to register a declared license
 * (LICENSE_TIMES) within a declaration. A license belongs to a license type
 * and has a duration in minutes.
 *
 * The owner (user_id) is taken from the authenticated request, never from the
 * payload.
 *
 * @package DTO
 */
final class CreateLicenseDTO
{
  public string $declarationId;
  public string $licenseTypeId;

  /**
   * Requested duration in minutes. Holds the raw scalar from the request
   * until validate() runs, which checks its format and normalizes it to a
   * plain int. duration_minutes is a single field (unlike the starts_at/
   * ends_at pair it replaces), so there is no separate "was it provided"
   * flag to keep in sync alongside it.
   */
  public int|string|null $durationMinutes;

  private function __construct(
    string $declarationId,
    string $licenseTypeId,
    int $durationMinutes
  ) {
    $this->declarationId = $declarationId;
    $this->licenseTypeId = $licenseTypeId;
    $this->durationMinutes = $durationMinutes;
  }

  /**
   * @param array{
   *     declaration_id?: string,
   *     license_type_id?: string,
   *     duration_minutes?: int
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['declaration_id'] ?? ''),
      (string) ($data['license_type_id'] ?? ''),
      $data['duration_minutes'] ?? null
    );
  }

  public function validate(): void
  {
    if ($this->declarationId === '') {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }
    if ($this->licenseTypeId === '') {
      throw new ApiException(ErrorType::missingField('license_type_id'));
    }

    $this->durationMinutes = (int) $this->durationMinutes;

    if ($this->durationMinutes <= 0) {
      throw new ApiException(
        ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero mayor a 0')
      );
    }
  }
}