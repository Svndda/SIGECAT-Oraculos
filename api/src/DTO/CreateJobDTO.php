<?php

declare(strict_types=1);

namespace DTO;

use Http\ApiException;
use Http\ErrorType;

/**
 * Class CreateJobDTO
 *
 * Encapsulates and validates the data required to create a new job.
 * * @package DTO
 */
final class CreateJobDTO
{
  public string $jobClassId;
  public string $name;
  public int $job_code;
  public ?string $description;

  /**
   * CreateJobDTO constructor.
   *
   * @param string      $jobClassId  The ID of the occupational class.
   * @param string      $name        The name of the job position.
   * @param int         $job_code        The unique numeric job_code for the job.
   * @param string|null $description An optional description for the job.
   */
  private function __construct(
    string $jobClassId,
    string $name,
    int $job_code,
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
      (string) ($data['job_class_id'] ?? ''),
      (string) ($data['name'] ?? ''),
      isset($data['job_code']) ? (int) $data['job_code'] : -1,
      isset($data['description']) ? (string) $data['description'] : null
    );
  }

  /**
   * Validates the internal state of the DTO based on business rules.
   *
   * @throws ApiException If any field fails validation constraints.
   * @return void
   */
  public function validate(): void
  {
    if (empty($this->jobClassId)) {
      throw new ApiException(ErrorType::missingField('job_class_id'));
    }

    if (empty($this->name)) {
      throw new ApiException(ErrorType::missingField('name'));
    }

    if (strlen($this->name) > 110) {
      throw new ApiException(
        ErrorType::invalidField(
          'name',
          'El nombre del puesto no puede exceder los 110 caracteres'
        )
      );
    }

    if ($this->job_code < 0 || $this->job_code > 200000) {
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
  }
}