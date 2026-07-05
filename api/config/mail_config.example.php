<?php
declare(strict_types=1);

/**
 * SMTP mail configuration.
 *
 * 1. Copy this file:  cp mail_config.example.php mail_config.php
 * 2. Fill in your Gmail credentials (mail_config.php is gitignored).
 *
 * HOW TO GET YOUR CREDENTIALS (Gmail):
 *   a. Use (or create) a Gmail account dedicated to this app.
 *   b. Turn on 2-Step Verification on that account:
 *      https://myaccount.google.com/security
 *   c. Create an "App Password" for Mail:
 *      https://myaccount.google.com/apppasswords
 *   d. Set SMTP_USER to the full Gmail address and SMTP_PASS to the
 *      16-character app password (not your regular Gmail password).
 *
 * Every value below can also be overridden via environment variables of the
 * same name (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_ENCRYPTION,
 * MAIL_FROM_ADDRESS, MAIL_FROM_NAME) — handy for docker-compose or a
 * deployment host without editing this file.
 */
final class MailConfig
{
  const SMTP_HOST       = 'smtp.gmail.com';
  const SMTP_PORT       = 587;
  const SMTP_ENCRYPTION = 'tls';
  const SMTP_USER       = 'your-project-gmail-address@gmail.com';
  const SMTP_PASS       = 'your-16-char-app-password';

  const FROM_ADDRESS    = 'your-project-gmail-address@gmail.com';
  const FROM_NAME       = 'SIGECAT – UCR';
}
