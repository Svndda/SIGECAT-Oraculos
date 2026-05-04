<?php
declare(strict_types=1);

namespace Repositories;

use PDO;

/**
 * Class Repository
 * 
 * Base class for all data access layers. Provides a shared PDO connection 
 * and encapsulates transaction management logic to ensure Atomicity, 
 * Consistency, Isolation, and Durability (ACID) across database operations.
 * 
 * @package Repositories
 */
abstract class Repository
{
  /**
   * Repository constructor.
   * 
   * @param PDO $db The active database connection instance.
   */
  protected function __construct(protected PDO $db)
  {
  }

  /**
   * Initiates a database transaction.
   * 
   * Use this before performing multiple related write operations (Insert/Update/Delete)
   * to ensure they are treated as a single unit of work.
   * 
   * @return void
   * @throws \PDOException If the transaction fails to start.
   */
  final protected function beginTransaction(): void
  {
    $this->db->beginTransaction();
  }

  /**
   * Commits the current transaction.
   * 
   * Permanently saves all changes made during the transaction to the database.
   * 
   * @return void
   * @throws \PDOException If the commit fails.
   */
  final protected function commit(): void
  {
    $this->db->commit();
  }

  /**
   * Reverts all changes made during the current transaction.
   * 
   * Safely rolls back operations if an error occurs.
   * @return void
   */
  final protected function rollBack(): void
  {
    if ($this->db->inTransaction()) {
      $this->db->rollBack();
    }
  }
}