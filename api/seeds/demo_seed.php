<?php
declare(strict_types=1);

/**
 * SIGECAT — Demo data seed.
 *
 * Populates the database with a small, self-contained set of demo accounts and
 * activity so the app looks alive during a presentation:
 *   - 1 admin + 4 employees, all @ucr.ac.cr, with KNOWN passwords (see DEMO_PASSWORD).
 *   - A job position assigned to each employee (reusing existing catalog rows).
 *   - A couple of declarations per employee across a few statuses.
 *
 * Everything it creates is tagged so it can be identified and removed:
 *   - users:         email starts with 'demo.'
 *   - job_positions: DESCRIPTION = 'SEED_DEMO', JOB_POSITION_NUMBER >= 9001
 *
 * The script is idempotent: it deletes any prior demo rows before re-inserting,
 * so it is safe to run multiple times.
 *
 * Usage (inside the api container):
 *   php /app/api/seeds/demo_seed.php          # seed
 *   php /app/api/seeds/demo_seed.php --purge   # remove demo data only
 *
 * It reuses the app's own ULID generator, bcrypt hashing and the CLIENT.*
 * stored functions so the seeded data respects all business rules and triggers.
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Mirror the app's PSR-0-style autoloader (public/index.php): map Namespace\Class
// to src/Namespace/Class.php, so Core\, Repositories\, etc. resolve.
$srcPath = __DIR__ . '/../src/';
spl_autoload_register(function (string $class) use ($srcPath): void {
  $file = realpath($srcPath . str_replace('\\', DIRECTORY_SEPARATOR, $class) . '.php');
  if ($file !== false) { require_once $file; }
});

use Core\UlidGenerator;

$pdo = require __DIR__ . '/../config/database.php';
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

const DEMO_PASSWORD = 'Demo1234!';
const DEMO_EMAIL_PREFIX = 'demo.';
const DEMO_POSITION_TAG = 'SEED_DEMO';
const DEMO_POSITION_BASE = 9001;

$purgeOnly = in_array('--purge', $argv, true);

/** Emits a progress line. */
function say(string $msg): void { echo $msg . "\n"; }

/**
 * Removes every row this seed may have created, in FK-safe order.
 * Declarations are children of demo job positions / users, so they go first.
 */
function purgeDemo(PDO $pdo): void {
  say('Purging previous demo data...');

  // Collect demo user + position ids.
  $userIds = $pdo->query(
    "SELECT user_id FROM users WHERE email LIKE '" . DEMO_EMAIL_PREFIX . "%@ucr.ac.cr'"
  )->fetchAll(PDO::FETCH_COLUMN);
  $positionIds = $pdo->query(
    "SELECT job_position_id FROM job_positions WHERE description = '" . DEMO_POSITION_TAG . "'"
  )->fetchAll(PDO::FETCH_COLUMN);

  if ($userIds) {
    $in = "'" . implode("','", $userIds) . "'";
    // Declarations and their status history / children.
    $declIds = $pdo->query("SELECT declaration_id FROM declarations WHERE user_id IN ($in)")->fetchAll(PDO::FETCH_COLUMN);
    if ($declIds) {
      $dIn = "'" . implode("','", $declIds) . "'";
      foreach (['job_functions', 'license_times', 'rest_times', 'declarations_status'] as $child) {
        $pdo->exec("DELETE FROM $child WHERE declaration_id IN ($dIn)");
      }
      $pdo->exec("DELETE FROM declarations WHERE declaration_id IN ($dIn)");
    }
    // Auth artifacts.
    foreach (['access_tokens', 'refresh_tokens', 'password_reset_tokens'] as $t) {
      $pdo->exec("DELETE FROM $t WHERE user_id IN ($in)");
    }
  }

  if ($positionIds) {
    $pIn = "'" . implode("','", $positionIds) . "'";
    $pdo->exec("DELETE FROM job_positions WHERE job_position_id IN ($pIn)");
  }
  if ($userIds) {
    $in = "'" . implode("','", $userIds) . "'";
    $pdo->exec("DELETE FROM users WHERE user_id IN ($in)");
  }

  say('  removed ' . count($userIds) . ' users, ' . count($positionIds) . ' positions.');
}

purgeDemo($pdo);
if ($purgeOnly) { say('Purge complete.'); return; }

// --- Reference rows from the existing catalog (reused, never modified) --------

$adminId = $pdo->query("SELECT user_id FROM users WHERE role='admin' AND is_deleted=0 FETCH FIRST 1 ROWS ONLY")->fetchColumn();
if ($adminId === false) { throw new RuntimeException('No admin user found to own created rows.'); }

$jobId = $pdo->query("SELECT job_id FROM jobs WHERE is_deleted=0 FETCH FIRST 1 ROWS ONLY")->fetchColumn();
if ($jobId === false) { throw new RuntimeException('No job found to attach positions to.'); }

$areaId = $pdo->query("SELECT area_id FROM areas WHERE is_deleted=0 FETCH FIRST 1 ROWS ONLY")->fetchColumn() ?: null;

// --- Demo users ---------------------------------------------------------------

$passwordHash = password_hash(DEMO_PASSWORD, PASSWORD_BCRYPT);

/** @var array<int,array{email:string,first:string,second:?string,last1:string,last2:string,role:string}> */
$people = [
  ['email' => 'demo.admin@ucr.ac.cr',  'first' => 'Demo',    'second' => null,     'last1' => 'Administrador', 'last2' => 'Sistema',  'role' => 'admin'],
  ['email' => 'demo.ana@ucr.ac.cr',    'first' => 'Ana',     'second' => 'María',  'last1' => 'Rojas',         'last2' => 'Vargas',   'role' => 'employee'],
  ['email' => 'demo.luis@ucr.ac.cr',   'first' => 'Luis',    'second' => null,     'last1' => 'Jiménez',       'last2' => 'Mora',     'role' => 'employee'],
  ['email' => 'demo.sofia@ucr.ac.cr',  'first' => 'Sofía',   'second' => null,     'last1' => 'Castro',        'last2' => 'Núñez',    'role' => 'employee'],
  ['email' => 'demo.marco@ucr.ac.cr',  'first' => 'Marco',   'second' => 'Andrés', 'last1' => 'Solís',         'last2' => 'Araya',    'role' => 'employee'],
];

$insUser = $pdo->prepare(
  "INSERT INTO users
     (user_id, email, first_name, second_name, first_last_name, second_last_name,
      password_hash, is_active, is_password_temp, failed_logging_attempts,
      role, created_by, created_at, is_deleted)
   VALUES
     (:id, :email, :first, :second, :last1, :last2,
      :hash, 1, 0, 0, :role, :created_by, CURRENT_TIMESTAMP, 0)"
);

$userIds = [];
foreach ($people as $p) {
  $id = UlidGenerator::generate();
  $insUser->execute([
    ':id' => $id, ':email' => $p['email'],
    ':first' => $p['first'], ':second' => $p['second'],
    ':last1' => $p['last1'], ':last2' => $p['last2'],
    ':hash' => $passwordHash, ':role' => $p['role'], ':created_by' => $adminId,
  ]);
  $userIds[$p['email']] = $id;
}
say('Created ' . count($userIds) . ' demo users (password for all: ' . DEMO_PASSWORD . ').');

// --- Job positions for the employees -----------------------------------------

$shifts = ['Diurna', 'Nocturna', 'Mixta', 'Media Diurna'];
$insPos = $pdo->prepare(
  "INSERT INTO job_positions
     (job_position_id, area_id, job_id, user_id, job_position_number,
      description, job_shift, created_by, created_at, is_deleted)
   VALUES
     (:id, :area_id, :job_id, :user_id, :num, :descr, :shift, :created_by, CURRENT_TIMESTAMP, 0)"
);

$positionByUser = [];
$i = 0;
foreach ($people as $p) {
  if ($p['role'] !== 'employee') { continue; }
  $posId = UlidGenerator::generate();
  $insPos->execute([
    ':id' => $posId,
    ':area_id' => $areaId,
    ':job_id' => $jobId,
    ':user_id' => $userIds[$p['email']],
    ':num' => DEMO_POSITION_BASE + $i,
    ':descr' => DEMO_POSITION_TAG,
    ':shift' => $shifts[$i % count($shifts)],
    ':created_by' => $adminId,
  ]);
  $positionByUser[$p['email']] = $posId;
  $i++;
}
say('Created ' . count($positionByUser) . ' demo job positions.');

// --- Declarations (via the app's stored functions) ---------------------------

$declRepo = new \Repositories\DeclarationsRepository($pdo);

$today = new DateTimeImmutable('today');
$made = 0;
$abandoned = 0;
$row = 0;
foreach ($positionByUser as $email => $posId) {
  $userId = $userIds[$email];
  // Two declarations each, on different days, an 8h shift.
  for ($d = 1; $d <= 2; $d++) {
    $start = $today->modify("-" . ($row * 2 + $d) . " days")->setTime(8, 0);
    $end   = $start->setTime(16, 0);
    $declId = UlidGenerator::generate();
    $declRepo->registerDeclaration($declId, $userId, $posId, $start, $end);
    $made++;
    // Abandon the first declaration of every employee to show status variety.
    if ($d === 1) {
      $declRepo->changeStatus($declId, 'Abandoned', $adminId);
      $abandoned++;
    }
  }
  $row++;
}
say("Created $made declarations ($abandoned marked Abandoned, rest Incomplete).");

say('');
say('Demo seed complete. Login with any of:');
foreach ($people as $p) {
  say(sprintf('  %-26s %s   (%s)', $p['email'], DEMO_PASSWORD, $p['role']));
}
