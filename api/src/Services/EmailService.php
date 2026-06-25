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

      $resetLink = $this->buildResetLink($rawToken);
      $expiry    = $expiresInMinutes . ' minuto' . ($expiresInMinutes !== 1 ? 's' : '');

      $mail->isHTML(true);
      $mail->Subject = 'Recuperación de contraseña – SIGECAT UCR';
      $mail->Body    = $this->buildRecoveryHtmlBody($toName, $resetLink, $expiry);
      $mail->AltBody = $this->buildRecoveryPlainBody($toName, $resetLink, $expiry);

      $mail->send();
    } catch (MailerException $e) {
      throw new ApiException(
        ErrorType::from('EMAIL_DISPATCH_FAILED', 'No fue posible enviar el correo de recuperación. Intente de nuevo más tarde.')
      );
    }
  }

  private function buildResetLink(string $token): string {
    $appUrl = getenv('APP_URL') ?: 'http://localhost:5173';
    return $appUrl . '/recuperar-contrasena/nueva?token=' . urlencode($token);
  }

  private function buildRecoveryPlainBody(
    string $name,
    string $resetLink,
    string $expiry
  ): string {
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

  private function buildRecoveryHtmlBody(
    string $name,
    string $resetLink,
    string $expiry
  ): string {
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8');

    return <<<HTML
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de contraseña</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f5f5f5; font-family:Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0;">
              <tr>
                <td style="background-color:#1565c0; padding:24px 32px;">
                  <span style="color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.03em;">SIGECAT</span>
                  <div style="color:#b8c8dc; font-size:12px; margin-top:4px;">Sistema de Gestión de Cargas de Trabajo &middot; UCR</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px; color:#1a1a1a; font-size:15px; line-height:1.5;">Estimado/a <strong>{$safeName}</strong>,</p>
                  <p style="margin:0 0 16px; color:#333333; font-size:14px; line-height:1.6;">
                    Hemos recibido una solicitud para restablecer la contraseña asociada a su cuenta en el sistema SIGECAT de la Universidad de Costa Rica.
                  </p>
                  <p style="margin:0 0 24px; color:#333333; font-size:14px; line-height:1.6;">
                    Para establecer una nueva contraseña, haga clic en el siguiente botón:
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                    <tr>
                      <td style="background-color:#12457d; border-radius:6px;">
                        <a href="{$safeLink}" target="_blank" style="display:inline-block; padding:12px 28px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; font-family:Arial, Helvetica, sans-serif;">
                          Restablecer contraseña
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 16px; color:#666666; font-size:13px; line-height:1.5;">
                    Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
                    <a href="{$safeLink}" style="color:#12457d; word-break:break-all;">{$safeLink}</a>
                  </p>
                  <p style="margin:0 0 8px; color:#666666; font-size:13px; line-height:1.5;">
                    Este enlace es válido durante <strong>{$expiry}</strong>. Si no lo usa en ese tiempo, deberá solicitar uno nuevo.
                  </p>
                  <p style="margin:0; color:#666666; font-size:13px; line-height:1.5;">
                    Si usted no solicitó este cambio, ignore este mensaje. Su contraseña actual permanecerá sin cambios.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f9f9fd; padding:16px 32px; border-top:1px solid #ebebeb;">
                  <p style="margin:0; color:#999999; font-size:12px; text-align:center;">Sistema SIGECAT &middot; Universidad de Costa Rica</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    HTML;
  }
}
