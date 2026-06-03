<?php
declare(strict_types=1);

namespace Services;

use Http\ApiException;
use Http\ErrorType;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailerException;

/**
 * EmailService
 *
 * Sends transactional emails via PHPMailer over authenticated SMTP.
 * Credentials and server settings are loaded from mail_config.php,
 * which is excluded from VCS (see mail_config.example.php for setup).
 */
class EmailService {

  /**
   * Sends a password recovery email containing a single-use token.
   *
   * @param string $toEmail          Recipient's institutional email.
   * @param string $toName           Recipient's full name for the greeting.
   * @param string $rawToken         The plain-text token (never stored).
   * @param int    $expiresInMinutes How long the token remains valid.
   * @throws ApiException            When the email cannot be dispatched.
   */
  public function sendPasswordRecoveryEmail(
    string $toEmail,
    string $toName,
    string $rawToken,
    int $expiresInMinutes = 60
  ): void {
    require_once __DIR__ . '/../../config/mail_config.php';

    $mail = new PHPMailer(true);

    try {
      $mail->isSMTP();
      $mail->Host       = \MailConfig::SMTP_HOST;
      $mail->SMTPAuth   = true;
      $mail->Username   = \MailConfig::SMTP_USER;
      $mail->Password   = \MailConfig::SMTP_PASS;
      // Allow a runtime override (SMTP_ENCRYPTION=ssl|tls), defaulting to config.
      $encryption = getenv('SMTP_ENCRYPTION') ?: \MailConfig::SMTP_ENCRYPTION;
      $mail->SMTPSecure = $encryption === 'ssl'
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
      $mail->Port       = \MailConfig::SMTP_PORT;
      $mail->CharSet    = 'UTF-8';

      $mail->setFrom(\MailConfig::FROM_ADDRESS, \MailConfig::FROM_NAME);
      $mail->addAddress($toEmail, $toName);

      $mail->isHTML(false);
      $mail->Subject = 'Recuperación de contraseña – SIGECAT UCR';
      $mail->Body    = $this->buildRecoveryBody($toName, $rawToken, $expiresInMinutes);

      $mail->send();
    } catch (MailerException $e) {
      throw new ApiException(
        ErrorType::from('EMAIL_DISPATCH_FAILED', 'No fue posible enviar el correo de recuperación. Intente de nuevo más tarde.')
      );
    }
  }

  private function buildRecoveryBody(
    string $name,
    string $token,
    int $expiresInMinutes
  ): string {
    $expiry    = $expiresInMinutes . ' minuto' . ($expiresInMinutes !== 1 ? 's' : '');
    $appUrl    = getenv('APP_URL') ?: 'http://localhost:5173';
    $resetLink = $appUrl . '/recuperar-contrasena/nueva?token=' . urlencode($token);

    return <<<TEXT
    Estimado/a {$name},

    Hemos recibido una solicitud para restablecer la contraseña asociada
    a su cuenta en el sistema SIGECAT de la Universidad de Costa Rica.

    Para establecer una nueva contraseña, ingrese al siguiente enlace:

        {$resetLink}

    Este enlace es válido durante {$expiry}. Si no lo usa en ese tiempo,
    deberá solicitar uno nuevo.

    Si usted no solicitó este cambio, ignore este mensaje.
    Su contraseña actual permanecerá sin cambios.

    Atentamente,
    Sistema SIGECAT – Universidad de Costa Rica
    TEXT;
  }
}
