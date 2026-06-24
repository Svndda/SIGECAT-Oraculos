<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateDeclarationStatusDTO
 *
 * Data transfer object for changing the status of a declaration.
 * Contains the status and validates it against a list of allowed statuses.
 *
 * @package DTO
 */
final class CreateDeclarationStatusDTO
{
  /**
   * The status value.
   *
   * @var string
   */
  public string $status;

  /**
   * Private constructor; use fromArray().
   *
   * @param string $status
   */
  private function __construct(string $status)
  {
    $this->status = $status;
  }

  /**
   * Creates a DTO from an associative array.
   *
   * @param array<string, mixed> $data Must contain 'status' key.
   * @return self
   */
  public static function fromArray(array $data): self
  {
    return new self((string)($data['status'] ?? ''));
  }

  /**
   * Validates the DTO.
   *
   * Ensures status is not empty and is one of the allowed values.
   *
   * @throws ApiException If status is missing or invalid.
   */
  public function validate(): void
  {
    if (empty($this->status)) {
      throw new ApiException(ErrorType::missingField('status'));
    }
    if (!in_array($this->status, self::ALLOWED_STATUSES, true)) {
      throw new ApiException(
        ErrorType::invalidField(
          'status',
          'Estado inválido. Valores permitidos: ' .
          implode(', ', self::ALLOWED_STATUSES)
        )
      );
    }
  }
  /**
   * List of allowed status values.
   *
   * @var array<string>
   */
  private const ALLOWED_STATUSES = [
    'Incomplete', 'Revision', 'Approved', 'Rejected', 'Abandoned', 'Completed'
  ];
}