<?php
declare(strict_types=1);

namespace Services;

use DTO\UpdateSectionDTO;
use DTO\CreateSectionDTO;
use Http\ApiException;
use Http\ErrorType;
use PDO;
use Repositories\SectionRepository;

/**
 * SectionService
 *
 * Orchestrates all business logic related to sections.
 *
 * Responsibilities:
 * - Delegates structural validation to CreateSectionDTO.
 * - Delegates persistence to SectionRepository.
 * - Enforces business rules (unique name, section existence, soft-delete).
 * - Has no knowledge of HTTP transport.
 */
class SectionService {

  private SectionRepository $sectionRepository;

  public function __construct(private PDO $pdo) {
    $this->sectionRepository = new SectionRepository($this->pdo);
  }

  /**
   * Normalizes and validates the read status filter.
   *
   * @throws ApiException when the value is not one of active|deleted|all.
   */
  private function normalizeStatus(string $status): string {
    $normalized = $status === '' ? 'active' : strtolower($status);
    if (!in_array($normalized, ['active', 'deleted', 'all'], true)) {
      throw new ApiException(ErrorType::invalidField('status'));
    }
    return $normalized;
  }

  /**
   * Registers a new section.
   *
   * Business rules:
   * - Section name must be unique among active sections (case-insensitive).
   *
   * @throws ApiException
   */
  public function createSection(string $createdBy, CreateSectionDTO $dto): void {
    $dto->validate();

    if ($this->sectionRepository->existsByName($dto->name)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una sección registrada con ese nombre')
      );
    }

    $this->sectionRepository->create($dto, $createdBy);

    Logger::info('section', 'Sección creada', 'section.create', [
      'name'       => $dto->name,
      'created_by' => $createdBy,
    ]);
  }

  /**
   * Updates name and/or description of an existing (active) section.
   *
   * Business rules:
   * - Section must exist and be active.
   *
   * @throws ApiException
   */
  public function updateSection(string $sectionId, UpdateSectionDTO $dto): void {
    $dto->validation();

    if ($this->sectionRepository->findById($sectionId) === null) {
      throw new ApiException(ErrorType::notFound('Section'));
    }

    if ($dto->name !== null && $this->sectionRepository->existsByName($dto->name, $sectionId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una sección registrada con ese nombre')
      );
    }

    $this->sectionRepository->update($sectionId, $dto);

    Logger::info('section', 'Sección actualizada', 'section.update', [
      'section_id' => $sectionId,
      'name'       => $dto->name,
    ]);
  }

  /**
   * Returns a paginated and optionally filtered list of sections.
   *
   * @param string $status One of active|deleted|all (default active).
   * @return array{data: array<int, array<string, mixed>>, meta: array<string, int>}
   * @throws ApiException
   */
  public function getSections(int $page, int $limit, string $filter = '',
        string $status = 'active'): array {
    if ($page < 1) {
      throw new ApiException(ErrorType::invalidField('page'));
    }
    if ($limit < 1 || $limit > 100) {
      throw new ApiException(ErrorType::invalidField('limit'));
    }

    $status = $this->normalizeStatus($status);

    $offset = ($page - 1) * $limit;
    $total  = $this->sectionRepository->countSections($filter, $status);
    $rows   = $this->sectionRepository->getSections($offset, $limit, $filter, $status);

    return [
      'data' => $rows,
      'meta' => [
        'page'        => $page,
        'limit'       => $limit,
        'total'       => $total,
        'total_pages' => (int) ceil($total / $limit),
      ],
    ];
  }

  /**
   * Returns a single section by its ID.
   *
   * @param string $status One of active|deleted|all (default active). With
   *                       'active', a soft-deleted section returns 404.
   * @return array<string, mixed> The section row as returned by the repository.
   * @throws ApiException
   */
  public function getById(string $sectionId, string $status = 'active'): array {
    if (empty($sectionId)) {
      throw new ApiException(ErrorType::missingField('section_id'));
    }

    $row = $this->sectionRepository->findById($sectionId);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Section'));
    }

    return $row;
  }

  /**
   * Soft-deletes an existing (active) section and cascades to its children
   * (departments, sections, units) and plazas. See docs/soft-delete-design.md §6.
   *
   * @throws ApiException
   */
  public function deleteSection(string $sectionId, string $deletedBy): void {
    if (empty($sectionId)) {
      throw new ApiException(ErrorType::missingField('section_id'));
    }

    if ($this->sectionRepository->findById($sectionId) === null) {
      throw new ApiException(ErrorType::notFound('Section'));
    }

    $this->sectionRepository->delete($sectionId, $deletedBy);

    Logger::warning('section', 'Sección eliminada', 'section.delete', [
      'section_id' => $sectionId,
      'deleted_by' => $deletedBy,
    ]);
  }

  /**
   * Restores a soft-deleted section.
   *
   * Business rules:
   * - Section must exist and currently be deleted.
   * - No active section may already use the same name (would break the partial
   *   unique index). Returns conflict if so.
   *
   * @throws ApiException
   */
  public function restoreSection(string $sectionId): void {
    if (empty($sectionId)) {
      throw new ApiException(ErrorType::missingField('section_id'));
    }

    $row = $this->sectionRepository->findById($sectionId);
    if ($row === null) {
      throw new ApiException(ErrorType::notFound('Section'));
    }

    $isDeleted = (int) ($row['is_deleted'] ?? $row['IS_DELETED'] ?? 0);
    if ($isDeleted === 0) {
      throw new ApiException(ErrorType::conflict('La sección no está eliminada'));
    }

    $name = (string) ($row['name'] ?? $row['NAME'] ?? '');
    if ($this->sectionRepository->existsByName($name, $sectionId)) {
      throw new ApiException(
        ErrorType::conflict('Ya existe una sección activa con ese nombre; no se puede reactivar')
      );
    }

    $this->sectionRepository->restoreSection($sectionId);

    Logger::info('section', 'Sección restaurada', 'section.restore', [
      'section_id' => $sectionId,
    ]);
  }
}