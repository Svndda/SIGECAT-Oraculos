<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * Class UpdateJobDTO
 *
 * Encapsulates and validates the data used to update an existing job.
 * Allows for partial updates by making all properties nullable.
 * * @package DTO
 */
final class UpdateJobDTO
{
  public ?string $jobClassId;
  public ?string $name;
  public ?int $job_code;
  public ?string $description;

  /**
   * UpdateJobDTO constructor.
   *
   * @param string|null $jobClassId  The ID of the occupational class.
   * @param string|null $name        The name of the job position.
   * @param int|null    $job_code        The unique numeric job_code for the job.
   * @param string|null $description An optional description for the job.
   */
  private function __construct(
    ?string $jobClassId,
    ?string $name,
    ?int $job_code,
    ?string $description
  ) {
    $this->jobClassId = $jobClassId;
    $this->name = $name;
    $this->job_code = $job_code;
    $this->description = $description;
  }

  /**
   * Initializes the DTO from a raw associative array.
   *
   * @param array{
   * job_class_id?: string,
   * name?: string,
   * job_code?: int|string,
   * description?: string
   * } $data The incoming request data payload.
   * * @return self
   */
  public static function fromArray(array $data): self
  {
    return new self(
      isset($data['job_class_id']) ? (string) $data['job_class_id'] : null,
      isset($data['name']) ? (string) $data['name'] : null,
      isset($data['job_code']) ? (int) $data['job_code'] : null,
      isset($data['description']) ? (string) $data['description'] : null
    );
  }

  /**
   * Validates the internal state of the DTO for partial updates.
   *
   * @throws ApiException If provided fields fail validation or if no fields are provided.
   * @return void
   */
  public function validate(): void
  {
    if ($this->jobClassId !== null && empty($this->jobClassId)) {
      throw new ApiException(ErrorType::invalidField('job_class_id'));
    }

    if ($this->name !== null) {
      if (empty($this->name)) {
        throw new ApiException(ErrorType::invalidField('name'));
      }
      if (strlen($this->name) > 110) {
        throw new ApiException(
          ErrorType::invalidField(
            'name',
            'El nombre del puesto no puede exceder los 110 caracteres'
          )
        );
      }
    }

    if (
      $this->job_code !== null
      && ($this->job_code < 0 || $this->job_code > 200000)
    ) {
      throw new ApiException(
        ErrorType::invalidField(
          'job_code',
          'El código debe ser un valor entre 0 y 200000'
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

    if (
      $this->jobClassId === null && $this->name === null &&
      $this->job_code === null && $this->description === null
    ) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_UPDATE',
          'Debe proporcionar al menos un campo para actualizar'
        )
      );
    }
  }
}