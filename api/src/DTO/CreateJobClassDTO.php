<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * Class CreateJobClassDTO
 *
 * Encapsulates and validates the data required to create a new job class.
 * @package DTO
 */
final class CreateJobClassDTO {
  public int $jobClassCode;
  public string $name;
  public ?string $description;

  /**
   * CreateJobClassDTO constructor.
   *
   * @param int         $jobClassCode  The code of the job class.
   * @param string      $name        The name of the job class.
   * @param string|null $description An optional description for the job class.
   */
  private function __construct(
    int $jobClassCode,
    string $name,
    ?string $description
  ) {
    $this->jobClassCode = $jobClassCode;
    $this->name = $name;
    $this->description = $description;
  }

  /**
   * Initializes the DTO from a raw associative array.
   *
   * @param array{
   * job_class_code?: int,
   * name?: string,
   * description?: string
   * } $data The incoming request data payload.
   * * @return self
   */
  public static function fromArray(array $data): self {
    return new self(
      isset($data['job_class_code']) ? (int) $data['job_class_code'] : -1,
      (string) ($data['name'] ?? ''),
      isset($data['description']) ? (string) $data['description'] : null
    );
  }

  public function validate(): void {
    if (empty($this->jobClassCode)) {
      throw new ApiException(ErrorType::missingField('job_class_code'));
    }

    if (strlen((string)$this->jobClassCode) != 5) {
      throw new ApiException(
        ErrorType::invalidField(
          'jobClassCode',
          'El código de la clase ocupacional debe tener 5 números'
        )
      );
    }

    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }

    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::invalidField(
          'name',
          'El nombre de la clase ocupacional no puede exceder los 110 caracteres'
        )
      );
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::invalidField(
          'description',
          'La descripción no puede exceder los 255 caracteres'
        )
      );
    }
  }
}