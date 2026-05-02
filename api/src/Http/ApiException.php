<?php
declare(strict_types=1);

namespace Http;

use RuntimeException;

/**
 * Class ApiException
 * 
 * A specialized exception that wraps an ErrorType object. 
 * Used to interrupt the application flow when a business rule is violated 
 * or an API-specific error occurs, allowing safe propagation through 
 * different architectural layers.
 * 
 * @package Http
 */
final class ApiException extends RuntimeException
{
  /**
   * ApiException constructor.
   * 
   * @param ErrorType $error The specific error domain object.
   * @param int $httpStatus The HTTP status code (defaults to 400 Bad Request).
   */
  public function __construct(
    private ErrorType $error,
    ?int $httpStatus = null
  ) {
    $status = $httpStatus ?? $error->getStatusCode();
    parent::__construct($error->jsonSerialize()['message'], $status);
  }

  /**
   * Retrieves the wrapped ErrorType instance.
   *  
   * @return ErrorType
   */
  public function getError(): ErrorType
  {
    return $this->error;
  }

  /**
   * Retrieves the HTTP status code associated with this exception.
   * 
   * @return int
   */
  public function getHttpStatus(): int
  {
    return $this->getCode();
  }
}
