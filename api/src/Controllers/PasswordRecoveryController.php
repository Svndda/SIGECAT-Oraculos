<?php
declare(strict_types=1);

namespace Controllers;

use DTO\PasswordRecoveryRequestDTO;
use DTO\PasswordResetDTO;
use Http\ApiException;
use Http\Request;
use Http\Response;
use PDO;
use Services\PasswordRecoveryService;
use Services\RateLimiter;

/**
 * PasswordRecoveryController
 *
 * Handles the two public (unauthenticated) endpoints for password recovery.
 * No auth token is required — the single-use email token is the credential.
 */
class PasswordRecoveryController {

  /** Per-IP throttle so the recovery flow can't be used to spam emails or probe accounts. */
  private const REQUEST_MAX_ATTEMPTS = 5;
  private const REQUEST_WINDOW_SECONDS = 900;
  private const RESET_MAX_ATTEMPTS = 10;
  private const RESET_WINDOW_SECONDS = 900;

  private PasswordRecoveryService $recoveryService;
  private RateLimiter $rateLimiter;

  public function __construct(private PDO $pdo) {
    $this->recoveryService = new PasswordRecoveryService($this->pdo);
    $this->rateLimiter = new RateLimiter($this->pdo);
  }

  /**
   * POST /auth/password-recovery/request
   *
   * Accepts an institutional email and sends a recovery token if the
   * account exists. Always returns 200 to avoid user enumeration.
   */
  public function request(): void {
    try {
      $this->rateLimiter->enforce(
        'auth.recovery.request',
        Request::clientIp(),
        self::REQUEST_MAX_ATTEMPTS,
        self::REQUEST_WINDOW_SECONDS
      );

      $data = Request::parseJsonRequest();
      $dto  = PasswordRecoveryRequestDTO::fromArray($data);

      $this->recoveryService->requestRecovery($dto);

      Response::success(
        ['message' => 'Si el correo está registrado, recibirá las instrucciones de recuperación en breve.'],
        null,
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /auth/password-recovery/reset
   *
   * Accepts the token from the email along with the new password.
   * On success all active sessions are revoked.
   */
  public function reset(): void {
    try {
      $this->rateLimiter->enforce(
        'auth.recovery.reset',
        Request::clientIp(),
        self::RESET_MAX_ATTEMPTS,
        self::RESET_WINDOW_SECONDS
      );

      $data = Request::parseJsonRequest();
      $dto  = PasswordResetDTO::fromArray($data);

      $this->recoveryService->resetPassword($dto);

      Response::success(
        ['message' => 'La contraseña ha sido actualizada exitosamente. Por favor, inicie sesión con su nueva contraseña.'],
        null,
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}
