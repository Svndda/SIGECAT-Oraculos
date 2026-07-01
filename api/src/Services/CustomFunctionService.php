<?php
declare(strict_types=1);

namespace Services;

use DTO\CreateCustomFunctionDTO;
use DTO\CustomFunctionResponseDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\CustomFunctionRepository;

/**
 * CustomFunctionService
 *
 * Business logic for employee custom functions (CUSTOM_FUNCTIONS). Functions
 * are scoped to their owner: a user only ever creates and reads their own.
 * Update and delete are intentionally unsupported.
 *
 * @package Services
 */
class CustomFunctionService
{
  private CustomFunctionRepository $repository;

  public function __construct(private PDO $pdo)
  {
    $this->repository = new CustomFunctionRepository($this->pdo);
  }

  /**
   * Creates a custom function owned by the given user. The name must be unique
   * among that user's functions.
   *
   * @return array<string, mixed> The created custom function.
   * @throws ApiException
   */
  public function createCustomFunction(string $userId, CreateCustomFunctionDTO $dto): array
  {
    $dto->validate();

    if ($this->repository->existsByName($dto->name, $userId)) {
      throw new ApiException(
        ErrorType::conflict('Ya tienes una función personalizada registrada con ese nombre')
      );
    }

    $id = $this->repository->createCustomFunction($userId, $dto);

    Logger::info('custom_function', 'Función personalizada creada', 'custom_function.create', [
      'custom_function_id' => $id,
      'name'               => $dto->name,
      'user_id'            => $userId,
    ]);

    return $this->getOwnedCustomFunctionById($userId, $id);
  }

  /**
   * Returns a single custom function owned by the user.
   *
   * @return array<string, mixed>
   * @throws ApiException when missing or not owned by the user.
   */
  public function getOwnedCustomFunctionById(string $userId, string $customFunctionId): array
  {
    if (trim($customFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('custom_function_id'));
    }

    $row = $this->repository->findById($customFunctionId);
    if ($row === null || (string) ($row['user_id'] ?? $row['USER_ID'] ?? '') !== $userId) {
      throw new ApiException(ErrorType::notFound('Función personalizada'));
    }

    return CustomFunctionResponseDTO::fromArray($row)->toArray();
  }

  /**
   * Returns a single custom function for a viewer: admins may read any, other
   * users only their own.
   *
   * @return array<string, mixed>
   * @throws ApiException when missing or not visible to the viewer.
   */
  public function getCustomFunctionByIdForViewer(string $viewerId, bool $isAdmin, string $customFunctionId): array
  {
    if (trim($customFunctionId) === '') {
      throw new ApiException(ErrorType::missingField('custom_function_id'));
    }

    $row = $this->repository->findById($customFunctionId);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Función personalizada'));
    }
    if (!$isAdmin && (string) ($row['user_id'] ?? $row['USER_ID'] ?? '') !== $viewerId) {
      throw new ApiException(ErrorType::notFound('Función personalizada'));
    }

    return CustomFunctionResponseDTO::fromArray($row)->toArray();
  }

  /**
   * Returns a paginated list of custom functions. A null $userId lists every
   * user's custom functions (admin read-only view); otherwise it is scoped to
   * that owner.
   *
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getCustomFunctions(int $page, int $limit, string $filter = '', ?string $userId = null): array
  {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $offset = ($page - 1) * $limit;

    $total = $this->repository->countCustomFunctions($filter, $userId);
    $rows  = $this->repository->getCustomFunctions($offset, $limit, $filter, $userId);

    $data = array_map(
      static fn(array $row) => CustomFunctionResponseDTO::fromArray($row)->toArray(),
      $rows
    );

    return [
      'data' => $data,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit),
      ],
    ];
  }
}
