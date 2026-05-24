<?php
declare(strict_types=1);

/**
 * SMTP mail configuration.
 *
 * Copy this file to mail_config.php and fill in the real credentials.
 * mail_config.php is listed in .gitignore and must never be committed.
 *
 * For UCR Google Workspace accounts use:
 *   SMTP_HOST = 'smtp.gmail.com'
 *   SMTP_PORT = 587
 *   SMTP_ENCRYPTION = 'tls'
 *   SMTP_USER = 'your-account@ucr.ac.cr'
 *   SMTP_PASS = 'your-app-password'   <- generate in Google account settings
 */
final class MailConfig
{
  const SMTP_HOST       = 'smtp.gmail.com';
  const SMTP_PORT       = 587;
  const SMTP_ENCRYPTION = 'tls';           // 'tls' (587) or 'ssl' (465)
  const SMTP_USER       = 'your-account@ucr.ac.cr';
  const SMTP_PASS       = 'your-app-password';

  const FROM_ADDRESS    = 'noreply@ucr.ac.cr';
  const FROM_NAME       = 'SIGECAT – UCR';
}
