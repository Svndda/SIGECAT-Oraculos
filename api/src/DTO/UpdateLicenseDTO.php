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
 * - Supports partial updates (license_type_id, starts_at, ends_at are optional).
 * - Validates the format of each field only when it is present.
 * - At least one updatable field must be provided.
 *
 * The cross-field rule (ends_at after starts_at) depends on the effective values
 * after the merge, so it is enforced by LicenseService against the existing row.
 *
 * @package DTO
 */
final class UpdateLicenseDTO
{
  public ?string $licenseTypeId;
  public bool $startsAtProvided;
  public bool $endsAtProvided;

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public ?string $startsAt;
  public ?string $endsAt;

  private function __construct(
    ?string $licenseTypeId,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->licenseTypeId = $licenseTypeId;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
  }

  /**
   * @param array{
   *     license_type_id?: string,
   *     starts_at?: string,
   *     ends_at?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['license_type_id']) ? (string) $data['license_type_id'] : null,
      CreateLicenseDTO::normalizeTimestamp($data['starts_at'] ?? null),
      CreateLicenseDTO::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
    );
  }

  public function validate(): void
  {
    if ($this->licenseTypeId !== null && trim($this->licenseTypeId) === '') {
      throw new ApiException(ErrorType::invalidField('license_type_id'));
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

    if ($this->licenseTypeId === null && !$this->startsAtProvided && !$this->endsAtProvided) {
      throw new ApiException(
        ErrorType::invalidField('license', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
  }
}
