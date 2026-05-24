<?php
declare(strict_types=1);

namespace Services;

/**
 * EmailService
 *
 * Sends transactional emails via PHP's mail() function.
 * All emails originate from the institutional noreply address.
 *
 * To replace this with a proper SMTP library (e.g. PHPMailer),
 * only this class needs to change — callers remain unaffected.
 */
class EmailService {

  private const FROM_ADDRESS = 'noreply@ucr.ac.cr';
  private const FROM_NAME    = 'SIGECAT – UCR';

  /**
   * Sends a password recovery email containing a single-use token.
   *
   * The user must submit this token to POST /auth/password-recovery/reset
   * together with the new password.
   *
   * @param string $toEmail          Recipient's institutional email.
   * @param string $toName           Recipient's full name for the greeting.
   * @param string $rawToken         The plain-text token (never stored).
   * @param int    $expiresInMinutes How long the token remains valid.
   * @return bool                    True if mail() accepted the message.
   */
  public function sendPasswordRecoveryEmail(
    string $toEmail,
    string $toName,
    string $rawToken,
    int $expiresInMinutes = 60
  ): bool {
    $subject = 'Recuperación de contraseña – SIGECAT UCR';
    $headers = implode("\r\n", [
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'From: ' . self::FROM_NAME . ' <' . self::FROM_ADDRESS . '>',
      'Reply-To: ' . self::FROM_ADDRESS,
      'X-Mailer: SIGECAT-API',
    ]);

    $body = $this->buildRecoveryBody($toName, $rawToken, $expiresInMinutes);

    return mail($toEmail, $subject, $body, $headers);
  }

  private function buildRecoveryBody(
    string $name,
    string $token,
    int $expiresInMinutes
  ): string {
    $expiry = $expiresInMinutes . ' minuto' . ($expiresInMinutes !== 1 ? 's' : '');

    return <<<TEXT
    Estimado/a {$name},

    Hemos recibido una solicitud para restablecer la contraseña asociada
    a su cuenta en el sistema SIGECAT de la Universidad de Costa Rica.

    Su token de recuperación es:

        {$token}

    Este token es válido durante {$expiry}. Úselo en el endpoint:

        POST /auth/password-recovery/reset
        {
          "token": "{$token}",
          "password": "<nueva contraseña>",
          "confirm_password": "<nueva contraseña>"
        }

    Si usted no solicitó este cambio, ignore este mensaje.
    Su contraseña actual permanecerá sin cambios.

    Atentamente,
    Sistema SIGECAT – Universidad de Costa Rica
    TEXT;
  }
}
