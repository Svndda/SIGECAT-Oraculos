<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateLicenseTypeDTO
 *
 * Encapsulates and validates the data used to update an existing license type
 * (LICENSE_TYPES). Supports partial updates; the only updatable field is the
 * name, which must be present and non-empty when provided.
 *
 * @package DTO
 */
final class UpdateLicenseTypeDTO
{
  public readonly ?string $name;

  private function __construct(?string $name)
  {
    $this->name = $name;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    return new self(isset($data['name']) ? (string) $data['name'] : null);
  }

  public function validate(): void
  {
    if ($this->name === null) {
      throw new ApiException(
        ErrorType::invalidField('license_type', 'Debe proporcionar al menos un campo para actualizar')
      );
    }
    if (trim($this->name) === '') {
      throw new ApiException(ErrorType::missingField('name'));
    }
    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_LICENSE_TYPE_NAME', 'El nombre del tipo de licencia no puede exceder los 110 caracteres'), 400
      );
    }
  }
}
