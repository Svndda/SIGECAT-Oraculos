# Soft Delete — Per-Entity Tasks

> Distributable tasks to roll out the soft-delete policy across all entities.
> Reference: `docs/soft-delete-design.md`. The DB migration
> (`SIGECAT-DB-SOFT-DELETE.sql`) is already applied to the shared Oracle DB, so
> **no one needs to touch the schema again** — only the PHP code per entity.
>
> **Reference implementation:** Area is complete end-to-end (repo + service +
> controller + routes). Copy `Area*` as the template. `DepartmentRepository` is
> also soft-delete ready (repo only).

## Status overview

| Entity | Exists today | Missing | Soft-delete |
|---|---|---|---|
| Area | repo + service + controller + routes | — | ✅ done (reference) |
| Department | repository only | service + controller + routes | repo ready |
| Section | nothing | full stack | from scratch |
| Unit | DTOs only | repository + service + controller + routes | from scratch |
| Job Positions | nothing | full stack | from scratch |
| Users | repo + service + controller | user-delete flow | columns ready |

## The pattern to replicate (from Area)

1. **Repository:** reads accept a `status` filter (active|deleted|all) defaulting to
   `is_deleted = 0`, and expose `is_deleted`/`deleted_at`; `existsBy*` counts active only;
   `delete()` → `UPDATE ... SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = :x`;
   cascade inside one transaction; `restore()`.
2. **Service:** `status` on getX/getById (invalid → 400); `delete` with `deletedBy`, no
   child-block; `restore` with unique-value conflict validation.
3. **Controller:** `?status=` on index/show; `authorizeStatus()` (active reads = any auth
   user, deleted = admin); all writes (create/update/delete/restore) = `requireAdmin`;
   `restore()` action.
4. **Routes:** add `POST /<resource>/{id}/restore`.

Per-level cascade (see design doc §6/§7):
- Delete **unit** → plazas `UNIT_ID = NULL`.
- Delete **section/department** → soft-delete its units + plazas `SECTION_ID`/`DEPARTMENT_ID`/`UNIT_ID = NULL`.
- Delete **area** → full cascade including soft-delete of plazas.

---

## Task 1 — Department: soft-delete endpoints

**Dependency:** `DepartmentRepository` is already soft-delete ready (reads with `status`,
soft `delete()` with cascade to units + plaza de-reference, `restore()`). Only the layers on
top are missing.

- [ ] `DepartmentService` (create/update/getAll/getById with `status`, delete with `deletedBy`, restore with name-conflict validation)
- [ ] `DepartmentController` (`?status=` on index/show, `authorizeStatus()` helper, all writes `requireAdmin`, `restore()` action)
- [ ] Routes: GET/POST/PUT/DELETE `/departments[/{id}]` + `POST /departments/{id}/restore`
- [ ] DepartmentResponseDTO exposing `is_deleted`/`deleted_at` (like AreaResponseDTO)

**Cascade:** deleting a department → soft-delete its units + set `DEPARTMENT_ID`/`UNIT_ID = NULL` on affected plazas (already in the repo).

**Done when:** PHPStan level 8 passes; non-admin gets 403 on writes and `status=deleted`; cascade verified in Oracle.

---

## Task 2 — Section: full stack + soft-delete

Section doesn't exist yet. Build the full stack with soft-delete from the start.

- [ ] DTOs: CreateSectionDTO / UpdateSectionDTO / SectionResponseDTO (`is_deleted`/`deleted_at`)
- [ ] `SectionRepository` (reads with `status` + `is_deleted=0` default; `existsByName` active only; soft `delete()` with cascade; `restore()`)
- [ ] `SectionService` (status, delete with `deletedBy`, restore + conflict check)
- [ ] `SectionController` (`?status=`, `authorizeStatus()`, writes `requireAdmin`, `restore()`)
- [ ] Routes incl. `POST /sections/{id}/restore`

**Cascade:** deleting a section → soft-delete its units + set `SECTION_ID`/`UNIT_ID = NULL` on affected plazas.

**Done when:** PHPStan level 8 passes; permissions + cascade verified.

---

## Task 3 — Unit: repository/service/controller + soft-delete

Only the Unit DTOs exist. Build repo/service/controller with soft-delete.

- [ ] `UnitRepository` (reads with `status`; soft `delete()`; `restore()`)
- [ ] UnitResponseDTO with `is_deleted`/`deleted_at`
- [ ] `UnitService` (status, delete with `deletedBy`, restore + conflict check)
- [ ] `UnitController` (`?status=`, `authorizeStatus()`, writes `requireAdmin`, `restore()`)
- [ ] Routes incl. `POST /units/{id}/restore`

**Cascade:** deleting a unit → set `UNIT_ID = NULL` on plazas that pointed to it (unit is a leaf).

**Note:** Unit belongs to a section OR a department (`SECTION_ID`/`DEPARTMENT_ID`, both nullable).

**Done when:** PHPStan level 8 passes; permissions verified; plaza de-reference verified.

---

## Task 4 — Job Positions (plazas): full stack + soft-delete

Build the Job Positions (plaza) entity. It's the leaf the org cascade de-references/cascades into.

- [ ] DTOs (Create/Update/Response) — Response exposes `is_deleted`/`deleted_at`
- [ ] `JobPositionRepository` (reads with `status`; `existsByNumber` active only — partial unique index `UX_JOB_POSITION_NUMBER_ACTIVE` already exists; soft `delete()`; `restore()`)
- [ ] `JobPositionService` (status, delete with `deletedBy`, restore + number-conflict check)
- [ ] `JobPositionController` (`?status=`, `authorizeStatus()`, writes `requireAdmin`, `restore()`)
- [ ] Routes incl. `POST /job-positions/{id}/restore`

**Cascade:** a plaza has no org children — on its own delete just soft-delete it. It is the
target of cascade from Area (soft-deleted) and de-reference from unit/section/dept (`*_ID = NULL`).

**Done when:** PHPStan level 8 passes; permissions verified.

---

## Task 5 — Users: soft-delete on account deletion (low priority)

USERS already has the soft-delete columns and the partial unique index
`UX_USERS_EMAIL_ACTIVE`. There's no user-delete endpoint yet (commented in routes), so this
is low priority.

- [ ] `UserRepository`: reads filter `is_deleted = 0`; replace any hard delete with soft delete; email lookups count active only
- [ ] On delete: set the user's plaza `JOB_POSITIONS.USER_ID = NULL` so the plaza becomes **vacant** (not deleted) — mirror of "no floating plaza"
- [ ] Endpoints: `?status=` (admin) + `restore`

**Note:** `is_active` (login enabled) and `is_deleted` (record removed) are different — keep both.

**Done when:** PHPStan level 8 passes.
