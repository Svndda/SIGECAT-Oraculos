# Design: Database Business-Logic Routines

> Decision record for the story *"DATABASE — Design and create 2
> Functions/Procedures for the business logic."* Defines the first stored
> PL/SQL routines in SIGECAT and how the PHP layer calls them.

## 1. Scope

Two routines, defined in `SIGECAT-DB-ROUTINES-business-logic.sql`:

| Routine | Kind | Replaces |
|---|---|---|
| `SP_DELETE_AREA_CASCADE(p_area_id, p_deleted_by)` | PROCEDURE | the inline cascade in `AreaRepository::deleteArea()` |
| `FN_AREA_HAS_ACTIVE_CHILDREN(p_area_id)` | FUNCTION | the two `COUNT(*)` queries in `AreaRepository::hasChildEntities()` |

These were the richest pieces of pure business logic still living in PHP. Moving
them into the database keeps the rule in one authoritative, atomic place and cuts
the area-delete from 5 round-trips to a single call.

## 2. Why these two

- **Procedure** — the area soft-delete cascade (`docs/soft-delete-design.md`
  §6/§7) is genuinely multi-statement, transactional business logic: the perfect
  candidate to encapsulate server-side.
- **Function** — `FN_AREA_HAS_ACTIVE_CHILDREN` returns a computed business value
  (0/1) and shows the FUNCTION side of the story. (`hasChildEntities()` is
  currently unused in PHP, but is kept and now backed by the function.)

## 3. Cascade correctness (schema changed since the original design)

`docs/soft-delete-design.md` §7 assumed `JOB_POSITIONS.AREA_ID` was **NOT NULL**
("every job position always belongs to an area"). That is no longer true:

- `SIGECAT-DB-MIGRATION-job-positions-area-nullable.sql` made `AREA_ID` nullable.
- `CHECK_JOB_POSITION_PARENT` now enforces that **exactly one** of
  `area_id / department_id / section_id / unit_id` is set.

Under that model a job position can hang off a department, section or unit
**without** an `area_id`. The old `deleteArea()` only soft-deleted positions with
`area_id = :area_id`, so positions attached to the area's departments/sections/units
were left pointing at a soft-deleted parent — a "floating" position, exactly what
§7 forbids.

`SP_DELETE_AREA_CASCADE` fixes this: it sweeps **every** job position in the area's
subtree (matched by area / department / section / unit), then the units, then the
departments and sections, then the area.

## 4. Conventions

- `CREATE OR REPLACE` → the migration is re-runnable / idempotent.
- Parameters are `VARCHAR2` (not `CHAR`) to mirror how `pdo_oci` binds the
  `CHAR(26)` ULIDs and avoid blank-padded comparison surprises.
- **Transaction ownership:** the procedure does **not** `COMMIT`/`ROLLBACK`. It
  runs inside the transaction the repository opens (`beginTransaction`/`commit`),
  so the PHP caller stays in control of the unit of work. Existence/404 checks
  also stay in the service layer.

## 5. How PHP calls them

```php
// Procedure (inside the repository's beginTransaction/commit):
$stmt = $this->db->prepare('BEGIN SP_DELETE_AREA_CASCADE(:area_id, :deleted_by); END;');
$stmt->execute([':area_id' => $areaId, ':deleted_by' => $deletedBy]);

// Function:
$stmt = $this->db->prepare('SELECT FN_AREA_HAS_ACTIVE_CHILDREN(:area_id) AS cnt FROM dual');
$stmt->execute([':area_id' => $areaId]);
```

## 6. Deploy

Run `SIGECAT-DB-ROUTINES-business-logic.sql` against the `CLIENT` schema, then
verify both objects compiled:

```sql
SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_name IN ('SP_DELETE_AREA_CASCADE', 'FN_AREA_HAS_ACTIVE_CHILDREN');
-- expect STATUS = VALID for both
```
