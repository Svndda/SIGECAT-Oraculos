<?php

declare(strict_types=1);

namespace Services;

use Core\UlidGenerator;
use DTO\CreateDeclarationStatusDTO;
use DTO\CreateDeclarationDTO;
use DTO\UpdateDeclarationJustificationDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use PDOException;
use Repositories\CustomFunctionRepository;
use Repositories\DeclarationsRepository;
use Repositories\JobFunctionRepository;
use Repositories\JobPositionRepository;
use Repositories\JobRepository;
use Repositories\OfficialFunctionRepository;
use Repositories\UserRepository;

/**
 * DeclarationsService
 *
 * Business logic for declaration management: creation, status transitions,
 * justification updates, listing with enrichment, and completeness checks.
 * Encapsulates validation, authorization rules, and transition constraints.
 * Does not handle HTTP communication.
 *
 * @package Services
 */
final class DeclarationsService
{
  /**
   * @var DeclarationsRepository
   */
  private DeclarationsRepository $declarationRepository;

  /**
   * @var JobPositionRepository
   */
  private JobPositionRepository $jobPositionRepository;

  /**
   * @var JobRepository
   */
  private JobRepository $jobRepository;

  /**
   * @var JobFunctionRepository
   */
  private JobFunctionRepository $jobFunctionRepository;
  /**
   * @var OfficialFunctionRepository
   */
  private OfficialFunctionRepository $officialFunctionRepository;
  /**
   * @var CustomFunctionRepository
   */
  private CustomFunctionRepository $customFunctionRepository;

  /**
   * @var UserRepository
   */
  private UserRepository $userRepository;

  /**
   * @var PDO
   */
  private PDO $pdo;

  /**
   * Constructor.
   *
   * @param PDO $pdo Active database connection.
   */
  public function __construct(PDO $pdo)
  {
    $this->pdo = $pdo;
    $this->declarationRepository = new DeclarationsRepository($this->pdo);
    $this->jobPositionRepository = new JobPositionRepository($this->pdo);
    $this->jobRepository = new JobRepository($this->pdo);
    $this->jobFunctionRepository = new JobFunctionRepository($this->pdo);
    $this->officialFunctionRepository = new OfficialFunctionRepository($this->pdo);
    $this->customFunctionRepository = new CustomFunctionRepository($this->pdo);
    $this->userRepository = new UserRepository($this->pdo);
  }

  /**
   * Creates a new declaration for the given user.
   *
   * Validates the DTO, checks that the job position exists, and ensures the user
   * has no incomplete declaration. Calls the repository to register the declaration.
   * On success, returns the enriched declaration data.
   *
   * @param string $userId ID of the authenticated user.
   * @param CreateDeclarationDTO $dto DTO with declaration data.
   * @return array<string, mixed> Enriched declaration data.
   * @throws ApiException If validation fails, position not found, incomplete exists,
   *   or database error with specific error codes (-20050, -20051, -20052) mapped.
   * @throws PDOException On unexpected database errors.
   */
  public function createDeclaration(string $userId, CreateDeclarationDTO $dto
  ): array {
    $dto->validate();

    if (!$this->jobPositionRepository->findById($dto->jobPositionId)) {
      throw new ApiException(
        ErrorType::from(
          'POSITION_NOT_FOUND', 'La posición laboral especificada no existe'
        )
      );
    }

    $incompleteId = $this->declarationRepository->findIncompleteByUser($userId);
    if ($incompleteId !== null) {
      throw new ApiException(
        ErrorType::from(
          'INCOMPLETE_EXISTS',
          'Actualmente cuenta con una solicitud incompleta. Por favor complétela o abandónela'
        )
      );
    }

    try {
      $declarationId = UlidGenerator::generate();
      $this->declarationRepository->registerDeclaration(
        $declarationId,
        $userId,
        $dto->jobPositionId,
        $dto->shiftStartsAt,
        $dto->shiftEndsAt
      );
      Logger::info('declaration', 'Declaración creada', 'declaration.create', [
        'declaration_id'  => $declarationId,
        'user_id'         => $userId,
        'job_position_id' => $dto->jobPositionId,
      ]);

      return $this->getDeclarationById($declarationId, false);
    } catch (PDOException $e) {
      $code = (int)$e->getCode();

      if ($code === -20050) {
        throw new ApiException(
          ErrorType::invalidField(
            'shift_ends_at',
            'El final de la jornada debe ser después de su inicio.'
          )
        );
      }
      if ($code === -20051) {
        throw new ApiException(
          ErrorType::from(
            'INCOMPLETE_EXISTS', 'Ya cuenta con una declaración incompleta.'
          )
        );
      }
      if ($code === -20052) {
        throw new ApiException(
          ErrorType::from('DUPLICATE_ID', 'ID duplicado.')
        );
      }
      throw $e;
    }
  }

  /**
   * Retrieves a single declaration by ID, with optional status history.
   *
   * Enriches the declaration with job position and user details.
   *
   * @param string $declarationId
   * @param bool $includeHistory Whether to include status_history.
   * @return array<string, mixed> Declaration data.
   * @throws ApiException If declaration not found or declaration_id empty.
   * @throws PDOException On database errors.
   */
  public function getDeclarationById(
    string $declarationId, bool $includeHistory = false
  ): array {
    if (empty($declarationId)) {
      throw new ApiException(ErrorType::missingField('declaration_id'));
    }

    $declaration = $this->declarationRepository->findById($declarationId);
    if ($declaration === null) {
      throw new ApiException(
        ErrorType::from('DECLARATION_NOT_FOUND', 'La declaración no existe')
      );
    }

    $currentStatus = $this->declarationRepository->getCurrentStatus(
      $declarationId
    );

    $result = [
      'declaration_id' => $declaration['declaration_id'],
      'user_id' => $declaration['user_id'],
      'job_position_id' => $declaration['job_position_id'],
      'shift_starts_at' => $declaration['shift_starts_at'],
      'shift_ends_at' => $declaration['shift_ends_at'],
      'justification' => $declaration['justification'],
      'current_status' => $currentStatus,
      'created_at' => $declaration['created_at']
    ];

    $jobPosition = $this->jobPositionRepository->findById(
      $declaration['job_position_id']
    );

    if ($jobPosition !== null) {
      $result['job_position'] = $jobPosition;

      $job = $this->jobRepository->findById($jobPosition['job_id']);
      if ($job !== null) {
        $item['job'] = $job;
      }
    }

    $jobFunctions = $this->jobFunctionRepository->getByDeclaration(
      $declarationId, 0, 50
    );

    if ($jobFunctions !== null) {
      foreach ($jobFunctions as &$jf) {
        if (!empty($jf['official_function_id'])) {
          $official = $this->officialFunctionRepository->findById(
            $jf['official_function_id']
          );
          if ($official) {
            $jf['function_name'] = $official['name'];
            $jf['function_description'] = $official['description'];
            $jf['function_type'] = 'official';
            $jf['expected_time'] = $official['expected_time'] ?? null;
          }
        } elseif (!empty($jf['custom_function_id'])) {
          $custom = $this->customFunctionRepository->findById(
            $jf['custom_function_id']
          );
          if ($custom) {
            $jf['function_name'] = $custom['name'];
            $jf['function_description'] = $custom['description'];
            $jf['function_type'] = 'custom';
          }
        }
      }
      $result['job_functions'] = $jobFunctions;
    }

    $user = $this->userRepository->findById(
      $declaration['user_id'],
      includeSensitiveInfo : false
    );

    if ($user !== null) {
      $result['user'] = $user;
    }

    if ($includeHistory) {
      $history = $this->declarationRepository->getStatusHistory($declarationId);
      $result['status_history'] = $history;
    }

    return $result;
  }

  /**
   * Changes the status of a declaration.
   *
   * Validates the DTO, checks existence, ownership/permissions, validates
   * transition, and enforces admin-only statuses. May require justification
   * if certain conditions are met (handled by stored procedure).
   *
   * @param string $declarationId
   * @param CreateDeclarationStatusDTO $dto
   * @param string $userId ID of the user making the change.
   * @param bool $isAdmin Whether the user is an administrator.
   * @return array<string, mixed>
   * @throws ApiException If declaration not found, unauthorized, invalid status,
   *   invalid transition, admin-only status attempted by non-admin, or database
   *   error codes (-20062, -20061) mapped.
   * @throws PDOException On unexpected database errors.
   */
  public function changeStatus(
    string $declarationId,
    CreateDeclarationStatusDTO $dto,
    string $userId,
    bool $isAdmin = false
  ): array {
    $dto->validate();

    $declaration = $this->declarationRepository->findById($declarationId);
    if ($declaration === null) {
      throw new ApiException(
        ErrorType::from('DECLARATION_NOT_FOUND', 'La declaración no existe')
      );
    }

    if (!$isAdmin && $declaration['user_id'] !== $userId) {
      throw new ApiException(
        ErrorType::from(
          'UNAUTHORIZED', 'No tiene permisos para modificar esta declaración'
        )
      );
    }

    $currentStatus = $this->declarationRepository->getCurrentStatus(
      $declarationId
    );
    if ($currentStatus === null) {
      throw new ApiException(
        ErrorType::from(
          'INVALID_STATUS', 'La declaración no tiene un estado válido'
        )
      );
    }

    if (!$this->isValidTransition($currentStatus, $dto->status)) {
      throw new ApiException(
        ErrorType::invalidField(
          'new_status',
          sprintf(
            'Transición de estado inválida: %s → %s', $currentStatus,
            $dto->status
          )
        )
      );
    }

    if (in_array(
        $dto->status, ['Revision', 'Approved', 'Rejected'], true
      ) && !$isAdmin) {
      throw new ApiException(
        ErrorType::from(
          'UNAUTHORIZED',
          'Solo los administradores pueden cambiar a este estado'
        )
      );
    }

    if ($dto->status === 'Abandoned'
      && !$isAdmin && $declaration['user_id'] !== $userId) {
      throw new ApiException(
        ErrorType::from(
          'UNAUTHORIZED',
          'Solo el propietario o administrador pueden abandonar una declaración'
        )
      );
    }

    try {
      $this->declarationRepository->changeStatus(
        $declarationId, $dto->status, $userId
      );

      Logger::info('declaration', 'Estado de declaración modificado', 'declaration.change_status', [
        'declaration_id' => $declarationId,
        'from'           => $currentStatus,
        'to'             => $dto->status,
        'actor_id'       => $userId,
        'as_admin'       => $isAdmin,
      ]);

      return [
        'declaration_id' => $declarationId,
        'new_status' => $dto->status,
        'previous_status' => $currentStatus
      ];
    } catch (PDOException $e) {
      $code = (int)$e->getCode();
      if ($code === -20062) {
        throw new ApiException(
          ErrorType::from(
            'JUSTIFICATION_REQUIRED',
            'Es necesario justificar la declaración, ya que algunas funciones del puesto quedan fuera del horario de turno declarado'
          )
        );
      }
      if ($code === -20061) {
        throw new ApiException(
          ErrorType::invalidField('new_status', $e->getMessage())
        );
      }
      throw new ApiException(
        ErrorType::from('DB_ERROR', 'Error al cambiar el estado')
      );
    }
  }

  /**
   * Determines if a status transition is allowed.
   *
   * @param string $currentStatus
   * @param string $newStatus
   * @return bool
   */
  private function isValidTransition(string $currentStatus, string $newStatus
  ): bool {
    if (!isset(self::STATUS_TRANSITIONS[$currentStatus])) {
      return false;
    }
    return in_array($newStatus, self::STATUS_TRANSITIONS[$currentStatus], true);
  }

  /**
   * Updates the justification of a declaration.
   *
   * Only allowed if the current status is 'Incomplete' and the user is the owner
   * or an admin.
   *
   * @param string $declarationId
   * @param UpdateDeclarationJustificationDTO $dto
   * @param string $userId
   * @param bool $isAdmin
   * @return array{declaration_id: string, justification: string}
   * @throws ApiException If declaration not found, unauthorized, or status not 'Incomplete'.
   * @throws PDOException
   */
  public function updateJustification(
    string $declarationId,
    UpdateDeclarationJustificationDTO $dto,
    string $userId,
    bool $isAdmin = false
  ): array {
    $dto->validate();

    $declaration = $this->declarationRepository->findById($declarationId);
    if ($declaration === null) {
      throw new ApiException(
        ErrorType::from('DECLARATION_NOT_FOUND', 'La declaración no existe')
      );
    }

    if (!$isAdmin && $declaration['user_id'] !== $userId) {
      throw new ApiException(
        ErrorType::from(
          'UNAUTHORIZED', 'No tiene permisos para modificar esta declaración'
        )
      );
    }

    $currentStatus = $this->declarationRepository->getCurrentStatus(
      $declarationId
    );

    if ($currentStatus !== 'Incomplete') {
      throw new ApiException(
        ErrorType::from(
          'INVALID_STATUS',
          'Solo se puede justificar una declaración en estado "Incomplete"'
        )
      );
    }

    $this->declarationRepository->updateJustification(
      $declarationId, $dto->justification
    );

    return [
      'declaration_id' => $declarationId,
      'justification' => $dto->justification
    ];
  }

  /**
   * Retrieves paginated declarations for a specific user.
   *
   * @param string $userId
   * @param int $page Page number (starting at 1).
   * @param int $limit Items per page (max 100).
   * @param array{
   *   status?: string,
   *   filter?: string,
   *   from_date?: string,
   *   to_date?: string
   * } $filters Additional filters (user_id is forced).
   * @return array<string, mixed>
   * }
   * @throws PDOException On database errors.
   */
  public function getUserDeclarations(
    string $userId,
    int $page = 1,
    int $limit = 10,
    array $filters = []
  ): array {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;

    $filters['user_id'] = $userId;

    $total = $this->declarationRepository->countAll($filters);
    $declarations = $this->declarationRepository->findAllPaginated(
      $limit, $offset, $filters
    );

    $enriched = $this->enrichDeclarations($declarations, false);

    return [
      'data' => $enriched,
      'meta' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => (int)ceil($total / $limit)
      ]
    ];
  }

  /**
   * Enriches a list of declarations with job position (and user if admin view).
   *
   * @param array<int, mixed> $declarations
   * @param bool $isAdminView Whether to include user details.
   * @return list<array<string, mixed>>
   */
  private function enrichDeclarations(array $declarations, bool $isAdminView):
  array {
    $enriched = [];
    foreach ($declarations as $declaration) {
      $item = [
        'declaration_id' => $declaration['declaration_id'],
        'user_id' => $declaration['user_id'],
        'job_position_id' => $declaration['job_position_id'],
        'shift_starts_at' => $declaration['shift_starts_at'],
        'shift_ends_at' => $declaration['shift_ends_at'],
        'justification' => $declaration['justification'],
        'current_status' => $declaration['current_status'],
        'created_at' => $declaration['created_at']
      ];

      $jobPosition = $this->jobPositionRepository->findById(
        $declaration['job_position_id']
      );

      if ($jobPosition !== null) {
        $item['job_position'] = $jobPosition;

        $job = $this->jobRepository->findById($jobPosition['job_id']);
        if ($job !== null) {
          $item['job'] = $job;
        }
      }

      if ($isAdminView) {
        $user = $this->userRepository->findById(
          $declaration['user_id'],
          includeSensitiveInfo : false
        );

        if ($user !== null) {
          $item['user'] = $user;
        }
      }

      $enriched[] = $item;
    }
    return $enriched;
  }

  /**
   * Retrieves paginated declarations for admin view, including user details.
   *
   * @param int $page
   * @param int $limit
   * @param array{
   *   user_id?: string,
   *   status?: string,
   *   filter?: string,
   *   from_date?: string,
   *   to_date?: string
   * } $filters
   * @return array<string, mixed>
   * }
   * @throws PDOException
   */
  public function getAllDeclarations(
    int $page = 1,
    int $limit = 10,
    array $filters = []
  ): array {
    $page = max(1, $page);
    $limit = max(1, min(100, $limit));
    $offset = ($page - 1) * $limit;

    $total = $this->declarationRepository->countAll($filters);
    $declarations = $this->declarationRepository->findAllPaginated(
      $limit, $offset, $filters
    );

    $enriched = $this->enrichDeclarations($declarations, true);

    return [
      'data' => $enriched,
      'meta' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => (int)ceil($total / $limit)
      ]
    ];
  }

  /**
   * Checks if the user has an incomplete declaration.
   *
   * @param string $userId
   * @return array{has_incomplete: bool, declaration_id?: string}
   * @throws PDOException
   */
  public function hasIncompleteDeclaration(string $userId): array
  {
    $declarationId = $this->declarationRepository->findIncompleteByUser(
      $userId
    );
    $result = ['has_incomplete' => $declarationId !== null];
    if ($declarationId !== null) {
      $result['declaration_id'] = $declarationId;
    }
    return $result;
  }

  /**
   * Allowed status transitions.
   *
   * Maps current status to a list of valid next statuses.
   *
   * @var array<string, list<string>>
   */
  private const STATUS_TRANSITIONS = [
    'Incomplete' => ['Completed', 'Abandoned'],
    'Revision' => ['Approved', 'Rejected', 'Abandoned'],
    'Approved' => ['Rejected'],
    'Rejected' => [],
    'Abandoned' => [],
    'Completed' => ['Revision']
  ];
}