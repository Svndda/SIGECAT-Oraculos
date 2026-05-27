<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * AreaRequestDTO
 *
 * Encapsulates and validates the data required to create or update an area.
 *
 * Responsibilities:
 * - Maps incoming request data using fromArray().
 * - Validates required fields: name.
 * - Ensures name does not exceed 110 characters and description does not exceed 255.
 *
 * Annotations:
 * @NotBlank name
 * @Size(max=110) name
 * @Size(max=255) description
 *
 * @package DTO
 */
final class AreaRequestDTO {
  /** @NotBlank */
  public readonly string $name;

  /** @Size(max=255) */
  public readonly ?string $description;

  private function __construct(string $name, ?string $description) {
    $this->name = $name;
    $this->description = $description;
  }

  /**
   * @param array{
   *     name?: string,
   *     description?: string
   * } $data
   */
  public static function fromArray(array $data): self {
    return new self(
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null,
    );
  }

  public function validate(): void {
    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }

    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::from('INVALID_AREA_NAME', 'El nombre del área no puede exceder los 110 caracteres')
      );
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::from('INVALID_AREA_DESC', 'La descripción del área no puede exceder los 255 caracteres')
      );
    }
  }
}
