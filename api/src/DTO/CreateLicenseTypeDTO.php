<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateLicenseTypeDTO
 *
 * Encapsulates and validates the data required to create a license type
 * (LICENSE_TYPES): the catalogue of authorized permits/licenses an employee can
 * declare. A license type is just a unique name.
 *
 * @package DTO
 */
final class CreateLicenseTypeDTO
{
  public readonly string $name;

  private function __construct(string $name)
  {
    $this->name = $name;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    return new self((string) ($data['name'] ?? ''));
  }

  public function validate(): void
  {
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
