<?php
declare(strict_types=1);

namespace Services;

use DTO\PasswordRecoveryRequestDTO;
use DTO\PasswordResetDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\AuthRepository;
use Repositories\PasswordRecoveryRepository;
use Repositories\UserRepository;

/**
 * PasswordRecoveryService
 *
 * Orchestrates the two-step password recovery flow:
 *   1. requestRecovery() — validates the email, generates a
 *      single-use token, stores its hash, and sends it by email.
 *   2. resetPassword()   — validates the token, enforces password
 *      strength, updates the credential, and invalidates all
 *      active sessions.
 *
 * Security notes:
 * - requestRecovery() always returns success, even for unknown
 *   emails, to prevent user-enumeration attacks.
 * - Tokens are stored only as SHA-256 hex digests; the raw value
 *   lives only in the email sent to the user.
 * - After a successful reset all access/refresh tokens are revoked,
 *   forcing the user to log in with the new credential.
 */
class PasswordRecoveryService {

  private const TOKEN_TTL_SECONDS  = 3600;   // 1 hour
  private const TOKEN_TTL_MINUTES  = 60;

  private PasswordRecoveryRepository $recoveryRepository;
  private UserRepository $userRepository;
  private AuthRepository $authRepository;
  private EmailService $emailService;

  public function __construct(private PDO $pdo) {
    $this->recoveryRepository = new PasswordRecoveryRepository($this->pdo);
    $this->userRepository     = new UserRepository($this->pdo);
    $this->authRepository     = new AuthRepository($this->pdo);
    $this->emailService       = new EmailService();
  }

  /**
   * Initiates a password recovery request.
   *
   * Generates a cryptographically secure token, stores its hash,
   * and sends the raw token to the user's email.
   * Returns silently for unknown emails (no enumeration).
   *
   * @throws ApiException On internal token/email failures.
   */
  public function requestRecovery(PasswordRecoveryRequestDTO $dto): void {
    $dto->validate();

    $user = $this->userRepository->findByEmail($dto->email);
    if ($user === null) {
      return;
    }

    $userId   = (string) ($user['USER_ID'] ?? $user['user_id']);
    $userName = trim(
      ($user['FIRST_NAME'] ?? $user['first_name'] ?? '') . ' ' .
      ($user['LAST_NAME']  ?? $user['last_name']  ?? '')
    );

    $rawToken  = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);

    $this->recoveryRepository->createToken($userId, $tokenHash, self::TOKEN_TTL_SECONDS);

    $this->emailService->sendPasswordRecoveryEmail(
      $dto->email,
      $userName,
      $rawToken,
      self::TOKEN_TTL_MINUTES
    );
  }

  /**
   * Completes a password reset using the token received by email.
   *
   * Business rules:
   * - Token must exist, not be expired, and not have been used.
   * - New password must pass strength rules.
   * - password and confirm_password must match.
   * - On success all active sessions for the user are revoked.
   *
   * @throws ApiException On invalid token, weak password, or mismatch.
   */
  public function resetPassword(PasswordResetDTO $dto): void {
    $dto->validate();

    $tokenHash = hash('sha256', $dto->token);
    $tokenRow  = $this->recoveryRepository->findValidToken($tokenHash);

    if ($tokenRow === null) {
      throw new ApiException(
        ErrorType::from('INVALID_RESET_TOKEN', 'El token de recuperación no es válido o ha expirado')
      );
    }

    $userId  = $tokenRow['user_id'];
    $tokenId = $tokenRow['token_id'];

    $hashedPassword = password_hash($dto->password, PASSWORD_ARGON2ID);

    $this->userRepository->updatePasswordById($userId, $hashedPassword);
    $this->recoveryRepository->markTokenAsUsed($tokenId);
    $this->authRepository->deleteUserTokens($userId);

    Logger::info('security', 'Contraseña restablecida por recuperación', 'auth.password_reset', [
      'user_id' => (string) $userId,
    ]);
  }
}
