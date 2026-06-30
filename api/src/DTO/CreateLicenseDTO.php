<?php
declare(strict_types=1);

namespace DTO;

use DateTimeImmutable;
use Http\ApiException;
use Http\ErrorType;

/**
 * CreateLicenseDTO
 *
 * Encapsulates and validates the data required to register a declared license
 * (LICENSE_TIMES) within a declaration. A license belongs to a license type and
 * spans a [starts_at, ends_at] range.
 *
 * The owner (user_id) is taken from the authenticated request, never from the
 * payload.
 *
 * @package DTO
 */
final class CreateLicenseDTO
{
  /** Canonical timestamp format used to bind against Oracle TIMESTAMP columns. */
  public const DB_TIMESTAMP_FORMAT = 'Y-m-d H:i:s';

  public string $declarationId;
  public string $licenseTypeId;

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public ?string $startsAt;
  public ?string $endsAt;

  private bool $startsAtProvided;
  private bool $endsAtProvided;

  private function __construct(
    string $declarationId,
    string $licenseTypeId,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->declarationId = $declarationId;
    $this->licenseTypeId = $licenseTypeId;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
  }

  /**
   * @param array{
   *     declaration_id?: string,
   *     license_type_id?: string,
   *     starts_at?: string,
   *     ends_at?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['declaration_id'] ?? ''),
      (string) ($data['license_type_id'] ?? ''),
      self::normalizeTimestamp($data['starts_at'] ?? null),
      self::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
    );
  }

  /**
   * Parses an incoming timestamp (ISO 8601 or 'Y-m-d H:i:s') into the canonical
   * 'Y-m-d H:i:s' string, or null when it is missing or unparseable.
   */
  public static function normalizeTimestamp(mixed $value): ?string
  {
    if (!is_string($value) || trim($value) === '') {
      return null;
    }
    try {
      return (new DateTimeImmutable(trim($value)))->format(self::DB_TIMESTAMP_FORMAT);
    } catch (\Exception) {
      return null;
    }
  }

  public function validate(): void
  {
    if ($this->declarationId === '') {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }
    if ($this->licenseTypeId === '') {
      throw new ApiException(ErrorType::missingField('license_type_id'));
    }

    $start = $this->requireTimestamp('starts_at', $this->startsAtProvided, $this->startsAt);
    $end   = $this->requireTimestamp('ends_at', $this->endsAtProvided, $this->endsAt);

    if ($end <= $start) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }
  }

  /**
   * Resolves a required timestamp field, raising the correct error when it is
   * missing versus present but malformed.
   */
  private function requireTimestamp(string $field, bool $provided, ?string $normalized): DateTimeImmutable
  {
    if (!$provided) {
      throw new ApiException(ErrorType::missingField($field));
    }
    if ($normalized === null) {
      throw new ApiException(
        ErrorType::invalidField($field, 'El formato de fecha y hora no es válido')
      );
    }
    return new DateTimeImmutable($normalized);
  }
}
