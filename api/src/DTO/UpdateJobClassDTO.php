<?php
declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * UpdateJobClassDTO
 *
 *  Encapsulates and validates the data used to update an existing job class.
 *  Allows for partial updates by making all properties nullable.
 * 
 * @package DTO
 */
final class UpdateJobClassDTO {
  public ?int $jobClassCode;
  public ?string $name;
  public ?string $description;

  /**
   * UpdateJobDTO constructor.
   *
   * @param int|null         $jobClassCode  The code of the job class.
   * @param string|null      $name        The name of the job class.
   * @param string|null $description An optional description for the job.
   */
  private function __construct(
    ?int $jobClassCode,
    ?string $name,
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
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['job_class_code']) ? (int) $data['job_class_code'] : null,
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['description']) ? (string) $data['description'] : null
    );
  }

  public function validate(): void {
    if ($this->jobClassCode !== null && empty($this->jobClassCode)) {
      throw new ApiException(ErrorType::invalidField('job_class_code'));
    }

    if ($this->jobClassCode !== null 
        && strlen((string)$this->jobClassCode) > 5) {
      throw new ApiException(
        ErrorType::invalidField(
          'job_class_code',
          'El código de la clase ocupacional  no puede exceder los 5 dígitos'
        )
      );
    }

    if ($this->name !== null) {
      if (empty($this->name)) {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::invalidField(
            'name',
            'El nombre de la clase ocupacional no puede exceder los 110 caracteres'
          )
        );
      }
    }

    if ($this->description !== null && strlen($this->description) > 255) {
      throw new ApiException(
        ErrorType::invalidField(
          'description',
          'La descripción no puede exceder los 255 caracteres'
        )
      );
    }

    if ($this->jobClassCode === null && $this->name === null && 
        $this->description === null ) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UPDATE',
          'Debe proporcionar al menos un campo para actualizar'
        )
      );
    }
  }
}