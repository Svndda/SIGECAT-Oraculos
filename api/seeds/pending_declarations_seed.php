<?php
declare(strict_types=1);

/**
 * SIGECAT — Pending-review declarations seed.
 *
 * Drives a few of the demo employees' declarations into the 'Revision' status so
 * the admin dashboard's "Pending review" queue (and the declarations page) has
 * something to act on. Every state change goes through the same Oracle function
 * the API uses (CLIENT.FN_CHANGE_DECLARATION_STATUS), so the DB-enforced
 * transition rules are respected: Incomplete -> Completed -> Revision.
 *
 * Timezone
 * --------
 * DECLARATIONS_STATUS.CREATED_AT rows are written by the API in a UTC session
 * (DBTIMEZONE is +00:00). A plain CLI session defaults to the OS timezone, so
 * its CURRENT_TIMESTAMP would land *behind* the existing rows and the new status
 * would never become "current". We pin the session to UTC to match the API.
 *
 * Scope & reversibility
 * ---------------------
 * Only declarations owned by the demo employees (email like demo.%@ucr.ac.cr)
 * are touched, so `demo_seed.php --purge` still cleanly removes everything. It
 * honours the one-incomplete-per-user rule: if an employee already has an
 * Incomplete declaration it advances that one, otherwise it registers a fresh
 * declaration first.
 *
 * Usage (from the repo root, with the wallet on TNS_ADMIN):
 *   TNS_ADMIN="$PWD/instantclient-.../network/admin" php api/seeds/pending_declarations_seed.php
 *
 * Optional: PENDING_PER_USER (default 2) controls how many per demo employee.
 */

require_once __DIR__ . '/../vendor/autoload.php';

$srcPath = __DIR__ . '/../src/';
spl_autoload_register(function (string $class) use ($srcPath): void {
  $file = realpath($srcPath . str_replace('\\', DIRECTORY_SEPARATOR, $class) . '.php');
  if ($file !== false) { require_once $file; }
});

use Core\UlidGenerator;

$pdo = require __DIR__ . '/../config/database.php';
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Match the API's UTC session so new CREATED_AT rows sort after existing ones.
$pdo->exec("ALTER SESSION SET TIME_ZONE = '+00:00'");

function say(string $msg): void { echo $msg . "\n"; }

$perUser = (int) (getenv('PENDING_PER_USER') ?: 2);
if ($perUser < 1) { $perUser = 1; }

$declRepo = new \Repositories\DeclarationsRepository($pdo);

/** Current status of a declaration (latest history row). */
$currentStatus = function (string $declId) use ($pdo): ?string {
  $s = $pdo->prepare(
    "SELECT status_value FROM (
       SELECT status_value, ROW_NUMBER() OVER (ORDER BY created_at DESC) rn
         FROM declarations_status WHERE declaration_id = :d
     ) WHERE rn = 1"
  );
  $s->execute([':d' => $declId]);
  $v = $s->fetchColumn();
  return $v === false ? null : (string) $v;
};

/** Direct, verified call to the transition function (clean IN/OUT bindings). */
$changeStatus = function (string $declId, string $newStatus, string $adminId) use ($pdo): void {
  $sid = UlidGenerator::generate();
  $stmt = $pdo->prepare('BEGIN :r := CLIENT.FN_CHANGE_DECLARATION_STATUS(:sid, :did, :ns, :cb); END;');
  $out = str_repeat(' ', 50);
  $stmt->bindValue(':sid', $sid);
  $stmt->bindValue(':did', $declId);
  $stmt->bindValue(':ns', $newStatus);
  $stmt->bindValue(':cb', $adminId);
  $stmt->bindParam(':r', $out, PDO::PARAM_STR | PDO::PARAM_INPUT_OUTPUT, 50);
  $stmt->execute();
};

// An admin performs the review-status changes (Revision is an admin action).
$adminId = $pdo->query(
  "SELECT user_id FROM users WHERE role='admin' AND is_deleted=0 FETCH FIRST 1 ROWS ONLY"
)->fetchColumn();
if ($adminId === false) { throw new RuntimeException('No admin user found.'); }

// Demo employees that hold an active position (needed to register a declaration).
$employees = $pdo->query(
  "SELECT u.user_id, MIN(jp.job_position_id) AS job_position_id
     FROM users u
     JOIN job_positions jp ON jp.user_id = u.user_id AND jp.is_deleted = 0
    WHERE u.email LIKE 'demo.%@ucr.ac.cr' AND u.role = 'employee' AND u.is_deleted = 0
    GROUP BY u.user_id"
)->fetchAll(PDO::FETCH_ASSOC);

if (!$employees) {
  say('No demo employees with a position found. Run demo_seed.php first.');
  return;
}

$today = new DateTimeImmutable('today');
$dayCursor = 0;
$made = 0;

foreach ($employees as $emp) {
  $userId = (string) $emp['user_id'];
  $posId  = (string) $emp['job_position_id'];

  for ($k = 0; $k < $perUser; $k++) {
    try {
      // Reuse an existing Incomplete if present, otherwise register a fresh one.
      $declId = $declRepo->findIncompleteByUser($userId);
      if ($declId === null) {
        $dayCursor++;
        $start = $today->modify("-{$dayCursor} days")->setTime(8, 0);
        $end   = $start->setTime(16, 0);
        $declId = UlidGenerator::generate();
        $declRepo->registerDeclaration($declId, $userId, $posId, $start, $end);
      }

      // Incomplete -> Completed -> Revision. A small gap keeps CREATED_AT
      // strictly increasing so the "current status" read between calls is stable.
      $changeStatus($declId, 'Completed', $adminId);
      usleep(15000);
      $changeStatus($declId, 'Revision', $adminId);
      $made++;
    } catch (\Throwable $e) {
      say('  skipped one (' . $e->getMessage() . ')');
    }
  }
}

$inRevision = $pdo->query(
  "SELECT COUNT(*) FROM (
     SELECT ds.declaration_id,
            ROW_NUMBER() OVER (PARTITION BY ds.declaration_id ORDER BY ds.created_at DESC) rn,
            ds.status_value
       FROM declarations_status ds
   ) WHERE rn = 1 AND status_value = 'Revision'"
)->fetchColumn();

say("Moved $made declaration(s) into 'Revision'.");
say("Total declarations currently in 'Revision': $inRevision");
