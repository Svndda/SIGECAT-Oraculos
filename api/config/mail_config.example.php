<?php
declare(strict_types=1);

/**
 * SMTP mail configuration.
 *
 * 1. Copy this file:  cp mail_config.example.php mail_config.php
 * 2. Fill in your Mailtrap credentials (mail_config.php is gitignored).
 *
 * HOW TO GET YOUR CREDENTIALS (Mailtrap — free):
 *   a. Create a free account at https://mailtrap.io
 *   b. Go to:  Email Testing → Inboxes → your inbox → SMTP Settings
 *   c. Copy Host, Port, Username and Password into the constants below.
 *
 * Leave FROM_ADDRESS and FROM_NAME as-is — Mailtrap accepts any sender.
 */
final class MailConfig
{
  const SMTP_HOST       = 'sandbox.smtp.mailtrap.io';
  const SMTP_PORT       = 2525;
  const SMTP_ENCRYPTION = 'tls';
  const SMTP_USER       = 'your-mailtrap-username';
  const SMTP_PASS       = 'your-mailtrap-password';

  const FROM_ADDRESS    = 'noreply@ucr.ac.cr';
  const FROM_NAME       = 'SIGECAT – UCR';
}
