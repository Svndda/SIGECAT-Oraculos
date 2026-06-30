<?php

declare(strict_types=1);

namespace Controllers;

use DTO\LoginUserDTO;
use Exception;
use Http\ApiException;
use Http\ErrorType;
use Http\Request;
use Http\Response;
use Services\AuthService;
use Services\RateLimiter;
use PDO;

/**
 * Handles authentication operations for the REST API.
 *
 * This controller is responsible for user login, token refresh,
 * and logout. Tokens are returned in the JSON response body: the client
 * sends the access token as an `Authorization: Bearer` header and the
 * refresh token in the request body for rotation operations.
 *
 * All methods return a standardised JSON response via the `Response`
 * helper and propagate business exceptions through `ApiException`.
 *
 * @package Controllers
 */
final class AuthController
{
  /** Allowed login attempts per IP within the window before a 429. */
  private const LOGIN_MAX_ATTEMPTS = 10;
  private const LOGIN_WINDOW_SECONDS = 300;

  private AuthService $authService;
  private RateLimiter $rateLimiter;

  /**
   * AuthController constructor.
   *
   * @param PDO $pdo Active database connection (injected by the router).
   */
  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
    $this->rateLimiter = new RateLimiter($this->pdo);
  }

  /**
   * POST /auth/login
   *
   * Authenticates a user with email and password.
   *
   * @return void
   * @throws Exception
   */
  public function login(): void
  {
    try {
      $this->rateLimiter->enforce(
        'auth.login',
        Request::clientIp(),
        self::LOGIN_MAX_ATTEMPTS,
        self::LOGIN_WINDOW_SECONDS
      );

      $data = Request::parseJsonRequest();
      $dto = LoginUserDTO::fromArray($data);
      $result = $this->authService->login($dto);

      $metaWithMsg = array_merge($result['meta'], ['message' => 'Sesión iniciada exitosamente']);
      Response::success($result['data'], $metaWithMsg, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /auth/refresh
   *
   * Rotates an existing refresh token and issues a new access/refresh token pair.
   *
   * @return void
   * @throws Exception
   */
  public function refresh(): void
  {
    try {
      $body = Request::parseJsonRequest();
      if (empty($body['refresh_token'])) {
        throw new ApiException(ErrorType::missingField('refresh_token'), 400);
      }

      $result = $this->authService->refreshTokens($body['refresh_token']);

      $metaWithMsg = array_merge($result['meta'], ['message' => 'Tokens refrescados exitosamente']);
      Response::success($result['data'], $metaWithMsg, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * POST /auth/logout
   *
   * Revokes all tokens belonging to the currently authenticated user.
   *
   * @return void
   */
  public function logout(): void
  {
    try {
      $this->authService->logout();

      Response::success(['logged_out' => true], ['message' => 'Sesión cerrada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}