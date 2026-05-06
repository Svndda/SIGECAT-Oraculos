<?php
declare(strict_types= 1);

class AllowedUserRoles {
  public const ADMIN = 'admin';
  public const EMPLOYEE = 'employee';

  public const ALL = [self::ADMIN, self::EMPLOYEE];

  public static function isValid(string $role): bool {
    return in_array($role, self::ALL, true);
  }
}