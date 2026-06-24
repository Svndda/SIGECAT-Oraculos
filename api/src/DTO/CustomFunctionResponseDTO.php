<?php
declare(strict_types=1);

namespace DTO;

/**
 * CustomFunctionResponseDTO
 *
 * Shapes a custom function (CUSTOM_FUNCTIONS) row for API responses: snake_case
 * keys with an `id` (not custom_function_id). Tolerates Oracle uppercase or
 * lowercase keys.
 *
 * @package DTO
 */
final class CustomFunctionResponseDTO
{
  public readonly string $id;
  public readonly string $userId;
  public readonly string $name;
  public readonly ?string $description;

  private function __construct(string $id, string $userId, string $name, ?string $description)
  {
    $this->id = $id;
    $this->userId = $userId;
    $this->name = $name;
    $this->description = $description;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;

    return new self(
      (string) ($get('custom_function_id') ?? ''),
      (string) ($get('user_id') ?? ''),
      (string) ($get('name') ?? ''),
      ($d = $get('description')) !== null ? (string) $d : null,
    );
  }

  /**
   * @return array{id: string, user_id: string, name: string, description: string|null}
   */
  public function toArray(): array
  {
    return [
      'id'          => $this->id,
      'user_id'     => $this->userId,
      'name'        => $this->name,
      'description' => $this->description,
    ];
  }
}
