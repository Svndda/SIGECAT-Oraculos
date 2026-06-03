<?php

declare(strict_types=1);

namespace Services;

use PDO;
use DTO\AccessTokenDTO;
use DTO\LoginUserDTO;
use DTO\RefreshTokenDTO;
use DTO\TokensRotationDTO;
use Http\ApiException;
use Http\ErrorType;
use Http\Request;
use Repositories\UserRepository;
use Repositories\AuthRepository;

/**
 * Service handling authentication logic including login, token refresh, logout,
 * and token validation. Centralizes login business rules (failed attempts, inactive).
 *
 * @package Services
 */
final class AuthService
{
  private const MAX_FAILED_ATTEMPTS = 5;

  private UserRepository $userRepository;
  private AuthRepository $authRepository;

  /**
   * AuthService constructor.
   *
   * @param PDO $pdo Active PDO database connection.
   */
  public function __construct(private PDO $pdo)
  {
    $this->userRepository = new UserRepository($this->pdo);
    $this->authRepository = new AuthRepository($this->pdo);
  }

  /**
   * Authenticates a user, enforcing active status and lockout rules.
   * Issues a new access/refresh token pair upon success.
   *
   * @param LoginUserDTO $dto Contains email and password.
   * @return array<string, mixed> The new tokens and user info.
   * @throws ApiException
   */
  public function login(LoginUserDTO $dto): array
  {
    $dto->validate();

    // Check against active users only. Soft-deleted users are considered non-existent for login.
    $user = $this->userRepository->findByEmail($dto->email, 'active');

    if ($user === null) {
      throw new ApiException(ErrorType::from('INVALID_CREDENTIALS', 'Credenciales inválidas'), 401);
    }

    $userId = (string) $user['user_id'];

    if ((int) $user['is_active'] === 0) {
      throw new ApiException(ErrorType::from('ACCOUNT_INACTIVE', 'La cuenta está desactivada'), 403);
    }

    if ((int) $user['failed_logging_attempts'] >= self::MAX_FAILED_ATTEMPTS) {
      throw new ApiException(ErrorType::from('ACCOUNT_LOCKED', 'La cuenta está bloqueada por demasiados intentos fallidos'), 403);
    }

    if (!password_verify($dto->password, (string) $user['password_hash'])) {
      $this->userRepository->incrementFailedAttempts($userId);
      throw new ApiException(ErrorType::from('INVALID_CREDENTIALS', 'Credenciales inválidas'), 401);
    }

    // Reset attempts on successful login
    $this->userRepository->resetFailedAttempts($userId);

    $accessTtl = 60 * 5;
    $refreshTtl = 3600; // 1 Hour

    $rawAccessToken = bin2hex(random_bytes(32));
    $rawRefreshToken = bin2hex(random_bytes(64));

    $accessHash = $this->hashToken($rawAccessToken);
    $refreshHash = $this->hashToken($rawRefreshToken);

    $accessDto = new AccessTokenDTO($userId, $accessHash, $accessTtl);
    $refreshDto = new RefreshTokenDTO($userId, $refreshHash, $refreshTtl);
    $rotationDto = new TokensRotationDTO($accessDto, $refreshDto);

    $this->authRepository->rotateTokensAtomic($rotationDto);

    $nameParts = array_filter(array_map('trim', [
      $user['first_name'] ?? '',
      $user['second_name'] ?? '',
      $user['first_last_name'] ?? '',
      $user['second_last_name'] ?? ''
    ]));

    return [
      'data' => [
        'access_token' => $rawAccessToken,
        'refresh_token' => $rawRefreshToken,
        'user_id' => $userId,
        'email' => $user['email'],
        'name' => implode(' ', $nameParts),
        'role' => $user['role'] ?? 'usr',
      ],
      'meta' => [
        'token_type' => 'Bearer',
        'expires_in' => $accessTtl,
      ],
    ];
  }

  /**
   * Rotates an expired or about‑to‑expire refresh token and issues a new token pair.
   *
   * Validates the provided raw refresh token, then atomically replaces
   * the user's existing tokens with a fresh pair.
   *
   * @param string $rawRefreshToken The raw refresh token from the client.
   *
   * @return array<mixed> The new access and refresh tokens along with expiry data.
   *
   * @throws ApiException When the refresh token is invalid, expired, or revoked.
   */
  public function refreshTokens(string $rawRefreshToken): array
  {
    $refreshHash = $this->hashToken($rawRefreshToken);
    $stored = $this->authRepository->findValidRefreshToken($refreshHash);

    if (!$stored) {
      throw new ApiException(ErrorType::invalidRefreshToken(), 401);
    }

    $userId = $stored['user_id'];
    $accessTtl = 60 * 5;
    $refreshTtl = 3600; // 1 Hour

    // Generate new raw tokens
    $rawNewAccess = bin2hex(random_bytes(32));
    $rawNewRefresh = bin2hex(random_bytes(64));

    $newAccessHash = $this->hashToken($rawNewAccess);
    $newRefreshHash = $this->hashToken($rawNewRefresh);

    $accessDto = new AccessTokenDTO($userId, $newAccessHash, $accessTtl);
    $refreshDto = new RefreshTokenDTO($userId, $newRefreshHash, $refreshTtl);
    $rotationDto = new TokensRotationDTO($accessDto, $refreshDto);

    $this->authRepository->rotateTokensAtomic($rotationDto);

    // Expiry timestamps.
    $accessExpiresAt = date('Y-m-d H:i:s', time() + $accessTtl);
    $refreshExpiresAt = date('Y-m-d H:i:s', time() + $refreshTtl);

    return [
      'data' => [
        'access_token' => $rawNewAccess,
        'access_expires_at' => $accessExpiresAt,
        'refresh_token' => $rawNewRefresh,
        'refresh_expires_at' => $refreshExpiresAt,
      ],
      'meta' => [
        'token_type' => 'Bearer',
        'expires_in' => $accessTtl,
      ],
    ];
  }

  /**
   * Logs out the currently authenticated user by deleting all their tokens.
   *
   * The method first tries to obtain the user from the current request context.
   * If that fails (invalid token), it attempts to
   * extract the token from the Authorization header or cookie, find the associated
   * user, and then delete the tokens.
   *
   * @return void
   *
   * @throws ApiException Only for unrecoverable database errors.
   */
  public function logout(): void
  {
    $userId = null;

    try {
      $auth = $this->requireAuth();
      $userId = $auth['user_id'];
    } catch (ApiException $e) {
      // Authentication failed, try to extract token and find user for cleanup.
      $rawToken = $this->extractTokenFromRequest();
      if ($rawToken === null) {
        // No token provided, nothing to revoke.
        return;
      }

      $tokenHash = $this->hashToken($rawToken);
      $tokenRecord = $this->authRepository->findAccessTokenByHash($tokenHash);
      if ($tokenRecord === null) {
        // Token not found in DB.
        return;
      }
      $userId = $tokenRecord['user_id'];
    }

    if ($userId !== null) {
      $this->authRepository->deleteUserTokens($userId);
    }
  }

  /**
   * Ensures that the current request is authenticated and returns the user info.
   *
   * The method checks the request context (static `Request::getUser()`), then
   * looks for a Bearer token in the `Authorization` header or a session cookie.
   *
   * @return array<mixed> The authenticated user's information (user_id, email, role).
   *
   * @throws ApiException When no valid authentication is present.
   */
  public function requireAuth(): array
  {
    // Check if authentication was already resolved by the session middleware.
    $existingUser = Request::getUser();
    if ($existingUser) {
      return $existingUser;
    }

    $rawToken = $this->extractTokenFromRequest();
    if ($rawToken === null) {
      throw new ApiException(ErrorType::unauthorized(), 401);
    }

    return $this->authenticate($rawToken);
  }

  /** @return array<string, mixed> */
  public function requireAdmin(): array
  {
    $auth = $this->requireAuth();
    if ($auth['role'] !== 'admin') {
      throw new ApiException(ErrorType::forbidden(), 403);
    }
    return $auth;
  }

  /**
   * Validates a raw access token and returns its associated token record.
   *
   * @param string $rawAccessToken The raw access token (not hashed).
   *
   * @return array<mixed> The token record containing user_id, token_hash, expires_at, revoked_at.
   *
   * @throws ApiException When the token is invalid, expired, or revoked.
   */
  public function validateAccessToken(string $rawAccessToken): array
  {
    $hash = $this->hashToken($rawAccessToken);
    $token = $this->authRepository->findValidAccessToken($hash);

    if ($token === null) {
      throw new ApiException(ErrorType::invalidAccessToken(), 401);
    }

    return $token;
  }

  /**
   * Hashes a raw token using SHA‑256.
   *
   * @param string $rawToken The raw token string.
   *
   * @return string The binary hash (ready for database storage/comparison).
   */
  private function hashToken(string $rawToken): string
  {
    return hash('sha256', $rawToken, true);
  }

  /**
   * Extracts a raw token from the request (Authorization header or cookie).
   *
   * @return string|null The raw token, or null if none was found.
   */
  private function extractTokenFromRequest(): ?string
  {
    $headers = getallheaders();
    $authorization =
      $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (str_starts_with($authorization, 'Bearer ')) {
      return trim(substr($authorization, 7));
    }

    $sessionCookie = $_COOKIE['sigecat_session_token'] ?? null;
    if ($sessionCookie !== null && is_string($sessionCookie)) {
      return $sessionCookie;
    }

    return null;
  }

  /**
   * Authenticates a raw access token and returns the corresponding user information.
   *
   * @param string $rawAccessToken The raw token from the request.
   *
   * @return array<mixed> The authenticated user's information (user_id, email, role).
   *
   * @throws ApiException When token validation fails or the user no longer exists.
   */
  private function authenticate(string $rawAccessToken): array
  {
    $tokenRecord = $this->validateAccessToken($rawAccessToken);
    $userId = $tokenRecord['user_id'];

    // Fetch user info from database for response.
    $user = $this->userRepository->findById($userId);

    if ($user === null) {
      throw new ApiException(ErrorType::from('USER_NOT_FOUND', 'El usuario no existe'));
    }

    return [
      'user_id' => (string) $user['user_id'],
      'email' => $user['email'],
      'role' => $user['role'],
    ];
  }
}