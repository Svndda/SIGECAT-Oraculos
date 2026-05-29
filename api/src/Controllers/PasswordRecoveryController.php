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

/**
 * PasswordRecoveryController
 *
 * Handles the two public (unauthenticated) endpoints for password recovery.
 * No auth token is required — the single-use email token is the credential.
 */
class PasswordRecoveryController {

  private PasswordRecoveryService $recoveryService;

  public function __construct(private PDO $pdo) {
    $this->recoveryService = new PasswordRecoveryService($this->pdo);
  }

  /**
   * POST /auth/password-recovery/request
   *
   * Accepts an institutional email and sends a recovery token if the
   * account exists. Always returns 200 to avoid user enumeration.
   */
  public function request(): void {
    try {
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
