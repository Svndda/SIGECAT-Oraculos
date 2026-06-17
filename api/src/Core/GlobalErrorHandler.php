<?php
declare(strict_types=1);

namespace Core;

use Http\Response;
use Http\ErrorType;
use Http\ApiException;
use ErrorException;
use PDOException;
use Throwable;

/**
 * Class GlobalErrorHandler
 * 
 * Responsible for capturing all unhandled errors and exceptions within the application.
 * It standardizes the error output by utilizing the centralized Response component,
 * ensuring that even critical failures follow the API's JSON specification.
 * 
 * @package Core
 */
class GlobalErrorHandler
{
  /**
   * Registers the custom error and exception handlers.
   * Should be called as early as possible during the application bootstrap.
   * 
   * @return void
   */
  public static function register(): void
  {
    set_error_handler([self::class, 'handleError']);
    set_exception_handler([self::class, 'handleException']);
  }

  /**
   * Converts PHP native errors into ErrorExceptions.
   * This allows all issues to be funneled through the handleException logic.
   * 
   * @param int $severity The level of the error raised.
   * @param string $message The error message.
   * @param string $file The filename where the error was raised.
   * @param int $line The line number where the error was raised.
   * @throws ErrorException
   */
  public static function handleError(
    int $severity, string $message,
    string $file, int $line): bool
  {
    if (!(error_reporting() & $severity)) {
      return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
  }

  /**
   * Catches all unhandled exceptions and generates a standardized JSON response.
   *
   * The technical detail of every failure is logged server-side, but it is never
   * forwarded to the client:
   * - ApiException carries an already user-safe message and status.
   * - PDOException is translated into a friendly, human-readable message
   *   (the raw ORA-##### text stays in the log only).
   * - Any other unexpected error returns a generic 500 message.
   *
   * @param Throwable $e The caught exception or error.
   * @return void
   */
  public static function handleException(Throwable $e): void
  {
    self::logThrowable($e);

    if ($e instanceof ApiException) {
      Response::error(
        $e->getError(),
        $e->getHttpStatus()
      );
      return;
    }

    if ($e instanceof PDOException) {
      $apiError = self::translateDatabaseError($e);
      Response::error(
        $apiError->getError(),
        $apiError->getHttpStatus()
      );
      return;
    }

    Response::error(
      ErrorType::internal('Ocurrió un error inesperado. Intente de nuevo más tarde.'),
      500
    );
  }

  /**
   * Logs the technical detail of a failure to the server's error log.
   * This is the only place the raw, internal message is kept.
   *
   * @param Throwable $e The caught exception or error.
   * @return void
   */
  private static function logThrowable(Throwable $e): void
  {
    error_log(sprintf(
      '[SIGECAT] %s: %s in %s:%d',
      get_class($e),
      $e->getMessage(),
      $e->getFile(),
      $e->getLine()
    ));
  }

  /**
   * Maps a database failure to a safe, human-readable ApiException.
   *
   * Oracle reports the cause in an "ORA-#####" token inside the driver message;
   * we map the common ones to clear Spanish messages and fall back to a generic
   * database error for everything else. The original ORA text is never exposed.
   *
   * @param PDOException $e The database exception raised by the driver.
   * @return ApiException
   */
  private static function translateDatabaseError(PDOException $e): ApiException
  {
    if (preg_match('/ORA-(\d{5})/', $e->getMessage(), $matches) === 1) {
      return match ($matches[1]) {
        // Unique constraint violated.
        '00001' => new ApiException(
          ErrorType::conflict('Ya existe un registro con esos datos.'), 409
        ),
        // Value too large for column.
        '12899' => new ApiException(
          ErrorType::from('FIELD_TOO_LONG', 'Uno de los campos supera la longitud permitida.'), 400
        ),
        // Cannot insert NULL into a NOT NULL column.
        '01400' => new ApiException(
          ErrorType::from('MISSING_REQUIRED_FIELD', 'Falta completar un campo obligatorio.'), 400
        ),
        // Parent key not found (FK references a missing row).
        '02291' => new ApiException(
          ErrorType::from('INVALID_REFERENCE', 'La referencia indicada no existe.'), 400
        ),
        // Child record found (cannot delete because of dependent rows).
        '02292' => new ApiException(
          ErrorType::conflict('No se puede eliminar porque tiene registros asociados.'), 409
        ),
        default => new ApiException(
          ErrorType::from('DATABASE_ERROR', 'No se pudo completar la operación por un problema con la base de datos.'), 500
        ),
      };
    }

    return new ApiException(
      ErrorType::from('DATABASE_ERROR', 'No se pudo completar la operación por un problema con la base de datos.'), 500
    );
  }
}