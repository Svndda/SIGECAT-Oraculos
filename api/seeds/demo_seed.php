<?php
declare(strict_types=1);

/**
 * SIGECAT — Demo data seed.
 *
 * Populates every admin CRUD with a healthy amount of realistic data so the app
 * looks alive during a presentation, plus demo accounts with KNOWN passwords:
 *
 *   - 1 admin + 4 employees, all @ucr.ac.cr (see DEMO_PASSWORD).
 *   - Catalog top-up: areas, departments, sections, units, jobs, license types.
 *   - A job position assigned to each employee.
 *   - A couple of declarations per employee across a few statuses.
 *
 * Reversibility & idempotency
 * ---------------------------
 * Every row this seed inserts is stamped with `CREATED_BY = <demo admin id>`
 * (catalog + positions) or belongs to a demo user (declarations, tokens). The
 * purge step deletes exactly those rows, child-before-parent, so the script is
 * safe to run repeatedly and `--purge` cleanly removes everything it created.
 * Existing (non-demo) data is never touched.
 *
 * Usage (inside the api container):
 *   php /app/api/seeds/demo_seed.php            # seed
 *   php /app/api/seeds/demo_seed.php --purge     # remove demo data only
 *
 * It reuses the app's own ULID generator, bcrypt hashing and the CLIENT.*
 * stored functions so seeded data respects all business rules and triggers.
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Mirror the app's autoloader (public/index.php): Namespace\Class -> src/Namespace/Class.php.
$srcPath = __DIR__ . '/../src/';
spl_autoload_register(function (string $class) use ($srcPath): void {
  $file = realpath($srcPath . str_replace('\\', DIRECTORY_SEPARATOR, $class) . '.php');
  if ($file !== false) { require_once $file; }
});

use Core\UlidGenerator;

$pdo = require __DIR__ . '/../config/database.php';
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

const DEMO_PASSWORD = 'Demo1234!';
const DEMO_EMAIL_LIKE = 'demo.%@ucr.ac.cr';
const DEMO_JOB_CODE_BASE = 90001;      // above the existing MAX(job_code)
const DEMO_POSITION_BASE = 9001;

$purgeOnly = in_array('--purge', $argv, true);

function say(string $msg): void { echo $msg . "\n"; }

/** Inserts a row and returns the generated ULID. */
function insert(PDO $pdo, string $sql, array $params): string {
  $pdo->prepare($sql)->execute($params);
  return $params[':id'];
}

/**
 * Removes every row this seed created, child-before-parent, scoped to demo
 * users (by id) so non-demo data is never affected.
 */
function purgeDemo(PDO $pdo): void {
  say('Purging previous demo data...');

  $demoIds = $pdo->query(
    "SELECT user_id FROM users WHERE email LIKE '" . DEMO_EMAIL_LIKE . "'"
  )->fetchAll(PDO::FETCH_COLUMN);

  if (!$demoIds) { say('  nothing to purge.'); return; }
  $in = "'" . implode("','", $demoIds) . "'";

  // Declarations owned by demo users, and their children.
  $declIds = $pdo->query("SELECT declaration_id FROM declarations WHERE user_id IN ($in)")->fetchAll(PDO::FETCH_COLUMN);
  if ($declIds) {
    $dIn = "'" . implode("','", $declIds) . "'";
    foreach (['job_functions', 'license_times', 'rest_times', 'declarations_status'] as $child) {
      $pdo->exec("DELETE FROM $child WHERE declaration_id IN ($dIn)");
    }
    $pdo->exec("DELETE FROM declarations WHERE declaration_id IN ($dIn)");
  }

  // Catalog + positions stamped with a demo admin as CREATED_BY, child->parent.
  foreach (['job_positions', 'units', 'sections', 'departments', 'areas', 'jobs', 'license_types'] as $t) {
    $pdo->exec("DELETE FROM $t WHERE created_by IN ($in)");
  }

  // Auth artifacts, then the users themselves.
  foreach (['access_tokens', 'refresh_tokens', 'password_reset_tokens'] as $t) {
    $pdo->exec("DELETE FROM $t WHERE user_id IN ($in)");
  }
  $pdo->exec("DELETE FROM users WHERE user_id IN ($in)");

  say('  removed demo data for ' . count($demoIds) . ' users.');
}

purgeDemo($pdo);
if ($purgeOnly) { say('Purge complete.'); return; }

// --- Demo users (created first: the admin owns every seeded catalog row) ------

$anExistingAdmin = $pdo->query("SELECT user_id FROM users WHERE role='admin' AND is_deleted=0 FETCH FIRST 1 ROWS ONLY")->fetchColumn();
if ($anExistingAdmin === false) { throw new RuntimeException('No admin user found to bootstrap.'); }

$passwordHash = password_hash(DEMO_PASSWORD, PASSWORD_BCRYPT);
$people = [
  ['email' => 'demo.admin@ucr.ac.cr', 'first' => 'Demo',  'second' => null,     'last1' => 'Administrador', 'last2' => 'Sistema', 'role' => 'admin'],
  ['email' => 'demo.ana@ucr.ac.cr',   'first' => 'Ana',   'second' => 'María',  'last1' => 'Rojas',         'last2' => 'Vargas',  'role' => 'employee'],
  ['email' => 'demo.luis@ucr.ac.cr',  'first' => 'Luis',  'second' => null,     'last1' => 'Jiménez',       'last2' => 'Mora',    'role' => 'employee'],
  ['email' => 'demo.sofia@ucr.ac.cr', 'first' => 'Sofía', 'second' => null,     'last1' => 'Castro',        'last2' => 'Núñez',   'role' => 'employee'],
  ['email' => 'demo.marco@ucr.ac.cr', 'first' => 'Marco', 'second' => 'Andrés', 'last1' => 'Solís',         'last2' => 'Araya',   'role' => 'employee'],
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
    ':id' => $id, ':email' => $p['email'], ':first' => $p['first'], ':second' => $p['second'],
    ':last1' => $p['last1'], ':last2' => $p['last2'], ':hash' => $passwordHash,
    ':role' => $p['role'], ':created_by' => $anExistingAdmin,
  ]);
  $userIds[$p['email']] = $id;
}
$owner = $userIds['demo.admin@ucr.ac.cr']; // owns every seeded catalog row
say('Created ' . count($userIds) . ' demo users (password for all: ' . DEMO_PASSWORD . ').');

// --- Catalog top-up (each CRUD gets a solid set of realistic rows) -----------

$areaNames = [
  'Área de Recursos Humanos', 'Área Financiera Contable', 'Área de Tecnologías de Información',
  'Área de Servicios Generales', 'Área de Vida Estudiantil', 'Área de Investigación',
  'Área de Salud', 'Área de Comunicación Institucional',
];
$areaIds = [];
$sqlArea = "INSERT INTO areas (area_id, name, description, created_by, created_at, is_deleted)
            VALUES (:id, :name, :descr, :created_by, CURRENT_TIMESTAMP, 0)";
foreach ($areaNames as $n) {
  $areaIds[] = insert($pdo, $sqlArea, [':id' => UlidGenerator::generate(), ':name' => $n, ':descr' => 'Unidad organizativa de nivel superior.', ':created_by' => $owner]);
}
say('  + ' . count($areaIds) . ' areas');

$deptNames = [
  'Departamento de Contabilidad', 'Departamento de Presupuesto', 'Departamento de Reclutamiento',
  'Departamento de Desarrollo de Software', 'Departamento de Redes y Telecomunicaciones',
  'Departamento de Mantenimiento', 'Departamento de Registro', 'Departamento de Bienestar Estudiantil',
  'Departamento de Enfermería', 'Departamento de Prensa', 'Departamento de Tesorería',
  'Departamento de Soporte Técnico',
];
$deptIds = [];
$sqlDept = "INSERT INTO departments (department_id, area_id, name, description, created_by, created_at, is_deleted)
            VALUES (:id, :area_id, :name, :descr, :created_by, CURRENT_TIMESTAMP, 0)";
foreach ($deptNames as $i => $n) {
  $deptIds[] = insert($pdo, $sqlDept, [':id' => UlidGenerator::generate(), ':area_id' => $areaIds[$i % count($areaIds)], ':name' => $n, ':descr' => 'Dependencia adscrita a un área.', ':created_by' => $owner]);
}
say('  + ' . count($deptIds) . ' departments');

$sectionNames = [
  'Sección de Nómina', 'Sección de Cuentas por Pagar', 'Sección de Soporte a Usuarios',
  'Sección de Infraestructura', 'Sección de Aseo y Limpieza', 'Sección de Transportes',
  'Sección de Admisiones', 'Sección de Becas', 'Sección de Consulta Externa',
  'Sección de Diseño Gráfico', 'Sección de Archivo', 'Sección de Proveeduría',
];
$sectionIds = [];
$sqlSection = "INSERT INTO sections (section_id, area_id, name, description, created_by, created_at, is_deleted)
               VALUES (:id, :area_id, :name, :descr, :created_by, CURRENT_TIMESTAMP, 0)";
foreach ($sectionNames as $i => $n) {
  $sectionIds[] = insert($pdo, $sqlSection, [':id' => UlidGenerator::generate(), ':area_id' => $areaIds[$i % count($areaIds)], ':name' => $n, ':descr' => 'Unidad operativa dentro de un área.', ':created_by' => $owner]);
}
say('  + ' . count($sectionIds) . ' sections');

$unitNames = [
  'Unidad de Planillas', 'Unidad de Tesorería', 'Unidad de Mesa de Ayuda', 'Unidad de Servidores',
  'Unidad de Jardinería', 'Unidad de Flota Vehicular', 'Unidad de Matrícula', 'Unidad de Trabajo Social',
  'Unidad de Farmacia', 'Unidad de Redes Sociales', 'Unidad de Bodega', 'Unidad de Correspondencia',
];
$sqlUnit = "INSERT INTO units (unit_id, section_id, name, description, created_by, created_at, is_deleted)
            VALUES (:id, :section_id, :name, :descr, :created_by, CURRENT_TIMESTAMP, 0)";
$unitCount = 0;
foreach ($unitNames as $i => $n) {
  insert($pdo, $sqlUnit, [':id' => UlidGenerator::generate(), ':section_id' => $sectionIds[$i % count($sectionIds)], ':name' => $n, ':descr' => 'Unidad mínima de trabajo.', ':created_by' => $owner]);
  $unitCount++;
}
say("  + $unitCount units");

$jobClassId = $pdo->query("SELECT job_class_id FROM job_classes WHERE is_deleted=0 FETCH FIRST 1 ROWS ONLY")->fetchColumn();
$jobNames = [
  'Analista de Sistemas', 'Técnico de Soporte', 'Contador', 'Asistente Administrativo',
  'Profesional en Recursos Humanos', 'Ingeniero de Software', 'Conserje', 'Chofer',
  'Enfermero', 'Periodista', 'Bibliotecario', 'Oficial de Seguridad',
];
$sqlJob = "INSERT INTO jobs (job_id, name, description, job_class_id, job_code, created_by, created_at, is_deleted)
           VALUES (:id, :name, :descr, :job_class_id, :job_code, :created_by, CURRENT_TIMESTAMP, 0)";
$jobIds = [];
foreach ($jobNames as $i => $n) {
  $jobIds[] = insert($pdo, $sqlJob, [':id' => UlidGenerator::generate(), ':name' => $n, ':descr' => 'Puesto de trabajo institucional.', ':job_class_id' => $jobClassId, ':job_code' => DEMO_JOB_CODE_BASE + $i, ':created_by' => $owner]);
}
say('  + ' . count($jobIds) . ' jobs');

$licenseNames = [
  'Incapacidad por enfermedad', 'Vacaciones', 'Permiso con goce de salario',
  'Permiso sin goce de salario', 'Licencia por maternidad', 'Licencia por paternidad',
  'Permiso por duelo', 'Licencia por estudio', 'Cita médica', 'Capacitación o congreso',
];
$sqlLic = "INSERT INTO license_types (license_type_id, name, created_by, created_at, is_deleted)
           VALUES (:id, :name, :created_by, CURRENT_TIMESTAMP, 0)";
$licCount = 0;
foreach ($licenseNames as $n) {
  insert($pdo, $sqlLic, [':id' => UlidGenerator::generate(), ':name' => $n, ':created_by' => $owner]);
  $licCount++;
}
say("  + $licCount license types");

// --- Job positions for the employees (reuse the seeded jobs/areas) -----------

$shifts = ['Diurna', 'Nocturna', 'Mixta', 'Media Diurna'];
$sqlPos = "INSERT INTO job_positions
             (job_position_id, area_id, job_id, user_id, job_position_number,
              description, job_shift, created_by, created_at, is_deleted)
           VALUES (:id, :area_id, :job_id, :user_id, :num, :descr, :shift, :created_by, CURRENT_TIMESTAMP, 0)";
$positionByUser = [];
$i = 0;
foreach ($people as $p) {
  if ($p['role'] !== 'employee') { continue; }
  $posId = insert($pdo, $sqlPos, [
    ':id' => UlidGenerator::generate(),
    ':area_id' => $areaIds[$i % count($areaIds)],
    ':job_id' => $jobIds[$i % count($jobIds)],
    ':user_id' => $userIds[$p['email']],
    ':num' => DEMO_POSITION_BASE + $i,
    ':descr' => 'Plaza asignada para la demostración.',
    ':shift' => $shifts[$i % count($shifts)],
    ':created_by' => $owner,
  ]);
  $positionByUser[$p['email']] = $posId;
  $i++;
}
say('Created ' . count($positionByUser) . ' demo job positions.');

// --- Declarations (via the app's stored functions) ---------------------------

$declRepo = new \Repositories\DeclarationsRepository($pdo);
$today = new DateTimeImmutable('today');
$made = 0; $abandoned = 0; $row = 0;
foreach ($positionByUser as $email => $posId) {
  $userId = $userIds[$email];
  for ($d = 1; $d <= 2; $d++) {
    $start = $today->modify("-" . ($row * 2 + $d) . " days")->setTime(8, 0);
    $end   = $start->setTime(16, 0);
    $declId = UlidGenerator::generate();
    $declRepo->registerDeclaration($declId, $userId, $posId, $start, $end);
    $made++;
    if ($d === 1) { $declRepo->changeStatus($declId, 'Abandoned', $owner); $abandoned++; }
  }
  $row++;
}
say("Created $made declarations ($abandoned Abandoned, rest Incomplete).");

say('');
say('Demo seed complete. Login with any of:');
foreach ($people as $p) {
  say(sprintf('  %-26s %s   (%s)', $p['email'], DEMO_PASSWORD, $p['role']));
}
