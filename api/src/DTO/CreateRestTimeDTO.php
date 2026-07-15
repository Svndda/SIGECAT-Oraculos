<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

final class CreateRestTimeDTO
{
  public const ALLOWED_REST_TYPES = ['Breakfast', 'Coffee', 'Dinner', 'Lunch'];
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

  public static function fromArray(array $data): self
  {
    $restType = isset($data['rest_type']) ? (string) $data['rest_type'] : '';
    $durationMinutes = isset($data['duration_minutes']) && is_numeric($data['duration_minutes'])
      ? (int) $data['duration_minutes']
      : 0;

    return new self(
      (string) ($data['declaration_id'] ?? ''),
      $restType,
      $durationMinutes
    );
  }

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