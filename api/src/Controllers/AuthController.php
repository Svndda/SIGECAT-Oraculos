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
use PDO;

/**
 * Handles authentication operations for the REST API.
 *
 * This controller is responsible for user login, token refresh,
 * and logout. It uses HTTP‑only cookies for access token storage
 * (web client convenience) while expecting the refresh token to be
 * sent in the JSON request body for rotation operations.
 *
 * All methods return a standardised JSON response via the `Response`
 * helper and propagate business exceptions through `ApiException`.
 *
 * @package Controllers
 */
final class AuthController
{
  private AuthService $authService;

  /**
   * AuthController constructor.
   *
   * @param PDO $pdo Active database connection (injected by the router).
   */
  public function __construct(private PDO $pdo)
  {
    $this->authService = new AuthService($this->pdo);
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
      $data = Request::parseJsonRequest();
      $dto = LoginUserDTO::fromArray($data);
      $result = $this->authService->login($dto);

      $accessToken = $result['data']['access_token'] ?? '';
      $expiresIn = $result['meta']['expires_in'] ?? 3600;

      setcookie(
        'sigecat_session_token',
        $accessToken,
        [
          'expires' => time() + $expiresIn,
          'path' => '/',
          'domain' => '',
          'secure' => false,
          'httponly' => true,
          'samesite' => 'Lax'
        ]
      );

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

      if (isset($result['data']['access_token'], $result['meta']['expires_in'])) {
        setcookie(
          'sigecat_session_token',
          $result['data']['access_token'],
          [
            'expires' => time() + (int) $result['meta']['expires_in'],
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
          ]
        );
      }

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

      setcookie(
        'sigecat_session_token',
        '',
        [
          'expires' => time() - 3600,
          'path' => '/',
          'domain' => '',
          'secure' => false,
          'httponly' => true,
          'samesite' => 'Lax'
        ]
      );

      Response::success(['logged_out' => true], ['message' => 'Sesión cerrada exitosamente'], 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}