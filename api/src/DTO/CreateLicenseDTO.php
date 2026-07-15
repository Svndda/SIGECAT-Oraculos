<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

final class CreateLicenseDTO
{
  public string $declarationId;
  public string $licenseTypeId;
  public int $durationMinutes;

  private function __construct(
    string $declarationId,
    string $licenseTypeId,
    int $durationMinutes
  ) {
    $this->declarationId = $declarationId;
    $this->licenseTypeId = $licenseTypeId;
    $this->durationMinutes = $durationMinutes;
  }

  public static function fromArray(array $data): self
  {
    $durationMinutes = isset($data['duration_minutes']) && is_numeric($data['duration_minutes'])
      ? (int) $data['duration_minutes']
      : 0;

    return new self(
      (string) ($data['declaration_id'] ?? ''),
      (string) ($data['license_type_id'] ?? ''),
      $durationMinutes
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
    if ($this->durationMinutes <= 0) {
      throw new ApiException(
        ErrorType::invalidField('duration_minutes', 'La duración debe ser un número entero mayor a 0')
      );
    }
  }
}