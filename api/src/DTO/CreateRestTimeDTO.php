<?php

declare(strict_types=1);

namespace DTO;

use DateTimeImmutable;
use Http\ApiException;
use Http\ErrorType;

/**
 * CreateRestTimeDTO
 *
 * Encapsulates and validates the data required to register a new rest time
 * entry within a declaration.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: user_id, declaration_id, rest_type, starts_at, ends_at.
 * - Ensures rest_type is one of the allowed values.
 * - Ensures the [starts_at, ends_at] range is coherent and within the maximum
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

  /** Canonical timestamp format used to bind against Oracle TIMESTAMP columns. */
  public const DB_TIMESTAMP_FORMAT = 'Y-m-d H:i:s';

  public string $userId;
  public string $declarationId;
  public ?string $restType;

  /** Normalized 'Y-m-d H:i:s' strings (null when missing or unparseable). */
  public ?string $startsAt;
  public ?string $endsAt;

  private bool $startsAtProvided;
  private bool $endsAtProvided;

  private function __construct(
    string $userId,
    string $declarationId,
    ?string $restType,
    ?string $startsAt,
    ?string $endsAt,
    bool $startsAtProvided,
    bool $endsAtProvided
  ) {
    $this->userId = $userId;
    $this->declarationId = $declarationId;
    $this->restType = $restType;
    $this->startsAt = $startsAt;
    $this->endsAt = $endsAt;
    $this->startsAtProvided = $startsAtProvided;
    $this->endsAtProvided = $endsAtProvided;
  }

  /**
   * @param array{
   *     user_id?: string,
   *     declaration_id?: string,
   *     rest_type?: string,
   *     starts_at?: string,
   *     ends_at?: string
   * } $data
   */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['user_id'] ?? ''),
      (string) ($data['declaration_id'] ?? ''),
      isset($data['rest_type']) ? (string) $data['rest_type'] : null,
      self::normalizeTimestamp($data['starts_at'] ?? null),
      self::normalizeTimestamp($data['ends_at'] ?? null),
      isset($data['starts_at']) && $data['starts_at'] !== '',
      isset($data['ends_at']) && $data['ends_at'] !== ''
    );
  }

  /** Maximum duration, in minutes, allowed for the given rest type. */
  public static function maxMinutesFor(string $restType): int
  {
    return self::MAX_MINUTES[$restType] ?? 60;
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
    if ($this->userId === '') {
      throw new ApiException(ErrorType::missingField('user_id'));
    }

    if ($this->declarationId === '') {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }

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

    $start = $this->requireTimestamp('starts_at', $this->startsAtProvided, $this->startsAt);
    $end   = $this->requireTimestamp('ends_at', $this->endsAtProvided, $this->endsAt);

    if ($end <= $start) {
      throw new ApiException(
        ErrorType::invalidField('ends_at', 'La hora de fin debe ser posterior a la de inicio')
      );
    }

    $minutes = ($end->getTimestamp() - $start->getTimestamp()) / 60;
    $maxMinutes = self::MAX_MINUTES[$this->restType];
    if ($minutes > $maxMinutes) {
      throw new ApiException(
        ErrorType::invalidField(
          'ends_at',
          "La duración del descanso '{$this->restType}' no puede exceder los {$maxMinutes} minutos"
        )
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
