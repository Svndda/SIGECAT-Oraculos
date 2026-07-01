<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * CreateCustomFunctionDTO
 *
 * Encapsulates and validates the data required to create a custom function
 * (CUSTOM_FUNCTIONS): a function an employee defines when it is not in the
 * official catalogue. The owner (user_id) is taken from the authenticated
 * request, never from the payload.
 *
 * @package DTO
 */
final class CreateCustomFunctionDTO
{
  public readonly string $name;
  public readonly ?string $description;

  private function __construct(string $name, ?string $description)
  {
    $this->name = $name;
    $this->description = $description;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    return new self(
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
    );
  }

  public function validate(): void
  {
    if (trim($this->name) === '') {
      throw new ApiException(ErrorType::missingField('name'));
    }
    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_NAME', 'El nombre de la función no puede exceder los 110 caracteres'), 400
      );
    }
    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_FUNCTION_DESC', 'La descripción no puede exceder los 255 caracteres'), 400
      );
    }
  }
}
