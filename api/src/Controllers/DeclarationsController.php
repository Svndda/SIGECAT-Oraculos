<?php

declare(strict_types=1);

namespace Controllers;

use DTO\CreateDeclarationStatusDTO;
use DTO\CreateDeclarationDTO;
use DTO\UpdateDeclarationJustificationDTO;
use Http\ApiException;
use Http\ErrorType;
use Http\Request;
use Http\Response;
use PDO;
use Services\AuthService;
use Services\DeclarationsService;

/**
 * DeclarationsController
 *
 * HTTP controller for declaration-related endpoints. Handles creation, retrieval,
 * status changes, justification updates, and history. All methods require
 * authentication and return JSON responses via the Response helper.
 *
 * @package Controllers
 */
final class DeclarationsController
{
  /**
   * Authentication service for verifying user identity and permissions.
   *
   * @var AuthService
   */
  private AuthService $authService;

  /**
   * Business logic service for declaration operations.
   *
   * @var DeclarationsService
   */
  private DeclarationsService $declarationService;

  /**
   * Constructor.
   *
   * Initializes the authentication and declaration services with the given PDO
   * connection.
   *
   * @param PDO $pdo Active database connection.
   */
  public function __construct(PDO $pdo)
  {
    $this->authService = new AuthService($pdo);
    $this->declarationService = new DeclarationsService($pdo);
  }

  /**
   * Creates a new declaration.
   *
   * Expects a JSON payload with job_position_id, shift_starts_at, and shift_ends_at.
   * The user must be authenticated. If the user already has an incomplete declaration,
   * an error is returned. On success, returns the created declaration with 201 status.
   *
   * @return void Outputs JSON response directly.
   */
  public function create(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];

      $data = Request::parseJsonRequest();
      $dto = CreateDeclarationDTO::fromArray($data);

      $declaration = $this->declarationService->createDeclaration(
        $userId, $dto
      );

      Response::success(
        $declaration,
        ['message' => 'Declaración creada exitosamente'],
        201
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Retrieves the authenticated user's declarations with pagination and filters.
   *
   * Query parameters:
   * - page (int, default 1)
   * - limit (int, default 10, max 100)
   * - status (string, default 'all')
   * - filter (string)
   * - from_date (string, date)
   * - to_date (string, date)
   *
   * @return void Outputs JSON response with data and meta.
   */
  public function getMyDeclarations(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];

      $page = max(1, (int)($_GET['page'] ?? 1));
      $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
      $status = trim((string)($_GET['status'] ?? 'all'));
      $filter = trim((string)($_GET['filter'] ?? ''));
      $fromDate = trim((string)($_GET['from_date'] ?? ''));
      $toDate = trim((string)($_GET['to_date'] ?? ''));

      $filters = [
        'status' => $status,
        'filter' => $filter,
        'from_date' => $fromDate,
        'to_date' => $toDate
      ];

      $result = $this->declarationService->getUserDeclarations(
        $userId, $page, $limit, $filters
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Declaraciones obtenidas exitosamente']
      );

      Response::success($result['data'], $metaWithMsg, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Retrieves all declarations (admin only) with pagination and filters.
   *
   * Query parameters:
   * - page (int, default 1)
   * - limit (int, default 10, max 100)
   * - status (string, default 'all')
   * - filter (string)
   * - user_id (string)
   * - from_date (string, date)
   * - to_date (string, date)
   *
   * @return void Outputs JSON response with data and meta.
   */
  public function index(): void
  {
    try {
      $this->authService->requireAdmin();

      $page = max(1, (int)($_GET['page'] ?? 1));
      $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
      $status = trim((string)($_GET['status'] ?? 'all'));
      $filter = trim((string)($_GET['filter'] ?? ''));
      $userId = trim((string)($_GET['user_id'] ?? ''));
      $fromDate = trim((string)($_GET['from_date'] ?? ''));
      $toDate = trim((string)($_GET['to_date'] ?? ''));

      $filters = [
        'status' => $status,
        'filter' => $filter,
        'user_id' => $userId,
        'from_date' => $fromDate,
        'to_date' => $toDate
      ];

      $result = $this->declarationService->getAllDeclarations(
        $page, $limit, $filters
      );

      $metaWithMsg = array_merge(
        $result['meta'],
        ['message' => 'Declaraciones obtenidas exitosamente']
      );

      Response::success($result['data'], $metaWithMsg, 200);
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Displays a single declaration by ID.
   *
   * If include_history query parameter is true, includes the full status history.
   * Checks ownership unless the user is an admin.
   *
   * @param string $declarationId The ULID of the declaration.
   * @return void Outputs JSON response with the declaration data.
   */
  public function show(string $declarationId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];
      // requireAdmin() throws for non-admins; here we only need a non-throwing
      // role check so owners can still view their own declaration (see below).
      $isAdmin = ($auth['role'] ?? '') === 'admin';

      $includeHistory = filter_var(
        $_GET['include_history'] ?? false,
        FILTER_VALIDATE_BOOLEAN
      );

      $declaration = $this->declarationService->getDeclarationById(
        $declarationId, $includeHistory
      );

      if (!$isAdmin && $declaration['user_id'] !== $userId) {
        throw new ApiException(
          ErrorType::from(
            'UNAUTHORIZED', 'No tiene permisos para ver esta declaración'
          )
        );
      }

      Response::success(
        $declaration,
        ['message' => 'Declaración obtenida exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Changes the status of a declaration.
   *
   * Expects a JSON payload with new_status. Validates permissions, transition rules,
   * and admin-only status changes. Returns the updated status info.
   *
   * @param string $declarationId The ULID of the declaration.
   * @return void Outputs JSON response.
   */
  public function changeStatus(string $declarationId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];
      $isAdmin = $this->authService->isAdmin();

      $data = Request::parseJsonRequest();
      $dto = CreateDeclarationStatusDTO::fromArray($data);

      $result = $this->declarationService->changeStatus(
        $declarationId, $dto, $userId, $isAdmin
      );

      Response::success(
        $result,
        ['message' => 'Estado actualizado exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Updates the justification of a declaration.
   *
   * Expects a JSON payload with justification. Only allowed if the current status
   * is 'Incomplete' and the user is the owner or an admin.
   *
   * @param string $declarationId The ULID of the declaration.
   * @return void Outputs JSON response.
   */
  public function updateJustification(string $declarationId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];
      $isAdmin = $this->authService->isAdmin();

      $data = Request::parseJsonRequest();
      $dto = UpdateDeclarationJustificationDTO::fromArray($data);

      $result = $this->declarationService->updateJustification(
        $declarationId, $dto, $userId, $isAdmin
      );

      Response::success(
        $result,
        ['message' => 'Justificación actualizada exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Checks whether the authenticated user has an incomplete declaration.
   *
   * @return void Outputs JSON with {has_incomplete: bool, declaration_id?: string}.
   */
  public function checkIncomplete(): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];

      $result = $this->declarationService->hasIncompleteDeclaration($userId);

      Response::success(
        $result,
        ['message' => 'Estado de declaración incompleta obtenido'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }

  /**
   * Retrieves the status history of a declaration.
   *
   * Checks ownership unless admin. Returns the history array.
   *
   * @param string $declarationId The ULID of the declaration.
   * @return void Outputs JSON response with the history list.
   */
  public function getHistory(string $declarationId): void
  {
    try {
      $auth = $this->authService->requireAuth();
      $userId = (string)$auth['user_id'];
      $isAdmin = $this->authService->isAdmin();

      // Verificar ownership antes de obtener el historial
      $declaration = $this->declarationService->getDeclarationById(
        $declarationId, false
      );

      if (!$isAdmin && $declaration['user_id'] !== $userId) {
        throw new ApiException(
          ErrorType::from(
            'UNAUTHORIZED',
            'No tiene permisos para ver el historial de esta declaración'
          )
        );
      }

      $history = $this->declarationService->getDeclarationById(
        $declarationId, true
      )['status_history'] ?? [];

      Response::success(
        $history,
        ['message' => 'Historial obtenido exitosamente'],
        200
      );
    } catch (ApiException $e) {
      Response::error($e->getError(), $e->getHttpStatus());
    }
  }
}