<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateDeclarationJustificationDTO
 *
 * Data transfer object for updating the justification of a declaration.
 * Contains the justification text and validates its length.
 *
 * @package DTO
 */
final class UpdateDeclarationJustificationDTO
{
  /**
   * The justification text.
   *
   * @var string
   */
  public string $justification;

  /**
   * Private constructor; use fromArray().
   *
   * @param string $justification
   */
  private function __construct(string $justification)
  {
    $this->justification = $justification;
  }

  /**
   * Creates a DTO from an associative array.
   *
   * @param array<string, mixed> $data Must contain 'justification' key.
   * @return self
   */
  public static function fromArray(array $data): self
  {
    return new self((string)($data['justification'] ?? ''));
  }

  /**
   * Validates the DTO.
   *
   * Ensures justification is not empty and does not exceed MAX_LENGTH.
   *
   * @throws ApiException If justification is missing or too long.
   */
  public function validate(): void
  {
    if (empty($this->justification)) {
      throw new ApiException(ErrorType::missingField('justification'));
    }
    if (strlen($this->justification) > self::MAX_LENGTH) {
      throw new ApiException(
        ErrorType::invalidField(
          'justification',
          'La justificación no puede exceder los ' . self::MAX_LENGTH . ' caracteres'
        )
      );
    }
  }
  /**
   * Maximum allowed length for justification.
   *
   * @var int
   */
  private const MAX_LENGTH = 4000;
}