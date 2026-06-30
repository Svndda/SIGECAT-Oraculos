<?php
declare(strict_types=1);

namespace DTO;

/**
 * LogResponseDTO
 *
 * Shapes a SYSTEM_LOGS row for API responses: snake_case keys with an `id`
 * (not log_id), and the stored JSON `context` decoded back into an object so
 * the client receives structured data instead of a string. Tolerates Oracle
 * uppercase/lowercase keys and CLOB columns returned as stream resources.
 *
 * @package DTO
 */
final class LogResponseDTO
{
  public readonly string $id;
  public readonly string $level;
  public readonly string $category;
  public readonly ?string $action;
  public readonly string $message;
  /** @var array<string, mixed>|null */
  public readonly ?array $context;
  public readonly ?string $userId;
  public readonly ?string $ipAddress;
  public readonly ?string $httpMethod;
  public readonly ?string $httpPath;
  public readonly ?int $statusCode;
  public readonly string $createdAt;

  /** @param array<string, mixed>|null $context */
  private function __construct(
    string $id,
    string $level,
    string $category,
    ?string $action,
    string $message,
    ?array $context,
    ?string $userId,
    ?string $ipAddress,
    ?string $httpMethod,
    ?string $httpPath,
    ?int $statusCode,
    string $createdAt
  ) {
    $this->id = $id;
    $this->level = $level;
    $this->category = $category;
    $this->action = $action;
    $this->message = $message;
    $this->context = $context;
    $this->userId = $userId;
    $this->ipAddress = $ipAddress;
    $this->httpMethod = $httpMethod;
    $this->httpPath = $httpPath;
    $this->statusCode = $statusCode;
    $this->createdAt = $createdAt;
  }

  /** @param array<string, mixed> $data */
  public static function fromArray(array $data): self
  {
    $get = static fn(string $c): mixed => $data[strtolower($c)] ?? $data[strtoupper($c)] ?? null;
    $str = static fn(mixed $v): ?string => $v !== null && $v !== '' ? (string) $v : null;

    return new self(
      (string) ($get('log_id') ?? ''),
      (string) ($get('log_level') ?? ''),
      (string) ($get('category') ?? ''),
      $str($get('action')),
      (string) ($get('message') ?? ''),
      self::decodeContext($get('context')),
      $str($get('user_id')),
      $str($get('ip_address')),
      $str($get('http_method')),
      $str($get('http_path')),
      $get('status_code') !== null ? (int) $get('status_code') : null,
      (string) ($get('created_at') ?? ''),
    );
  }

  /**
   * Normalizes the stored context column (string or CLOB stream) into an array.
   *
   * @param mixed $raw
   * @return array<string, mixed>|null
   */
  private static function decodeContext(mixed $raw): ?array
  {
    if (is_resource($raw)) {
      $raw = stream_get_contents($raw) ?: '';
    }
    if (!is_string($raw) || $raw === '') {
      return null;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
  }

  /** @return array<string, mixed> */
  public function toArray(): array
  {
    return [
      'id'          => $this->id,
      'level'       => $this->level,
      'category'    => $this->category,
      'action'      => $this->action,
      'message'     => $this->message,
      'context'     => $this->context,
      'user_id'     => $this->userId,
      'ip_address'  => $this->ipAddress,
      'http_method' => $this->httpMethod,
      'http_path'   => $this->httpPath,
      'status_code' => $this->statusCode,
      'created_at'  => $this->createdAt,
    ];
  }
}
