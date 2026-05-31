# Design: Soft Delete for Users and Organization

> Team decision record. Defines the deletion policy for this delivery and the
> technical plan **everyone** must follow so the entities stay consistent.

## 1. Decision

Professor's ruling:

> "Soft delete **everything**. In theory those cases shouldn't happen. But if a
> plaza is removed it **shouldn't be left floating**."

Therefore:

1. **No deletion is physical.** Every `DELETE FROM ...` is replaced by a logical flag.
2. **Deleting a parent cascades to its children** — deleting an area marks its
   sections/departments as deleted, and those mark their units.
3. **Plazas are never left floating:** when an organization entity is deleted, the plazas
   (`JOB_POSITIONS`) that reference it re-anchor to the level above, or are cascade-deleted
   (when the area itself is deleted). See §7.

Applies to the **users** table, the **organization** tables (`AREAS`, `DEPARTMENTS`,
`SECTIONS`, `UNITS`), and the **plazas** table (`JOB_POSITIONS`, brought into scope — see §7).

## 2. Current state (to fix)

Deletion today is **inconsistent**:

| Location | Current behavior | Problem |
|---|---|---|
| `AreaService::deleteArea()` | **Blocks** if children exist + **hard delete** (`DELETE FROM AREAS`) | Contradicts the cascade; it's a physical delete |
| `AreaRepository::hasChildEntities()` | Counts children to block | No longer used to block; reused to drive the cascade |
| `DepartmentRepository::delete()` | **Hard delete** with no guard | Physical delete |
| `UNITS` / `SECTIONS` | No deletion logic yet | Implement directly as soft delete |
| `USERS` | Has `is_active` but no deletion flag | Add a deletion flag |
| `JOB_POSITIONS` (plazas) | No deletion logic; references area/unit/dept/section and user | Handle per §7 |

> **`is_active` ≠ `is_deleted`** on `USERS`: `is_active` = account enabled/disabled (login);
> `is_deleted` = record removed from the system. They are distinct concepts and must coexist
> as separate columns.

## 3. Schema changes (Oracle)

Add to **every** in-scope table (`USERS`, `AREAS`, `DEPARTMENTS`, `SECTIONS`, `UNITS`,
`JOB_POSITIONS`):

```sql
ALTER TABLE <table> ADD (
  is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,   -- 0 = active, 1 = deleted
  deleted_at  TIMESTAMP  NULL,                  -- when it was deleted
  deleted_by  CHAR(26)   NULL                   -- ULID of the user who deleted it (audit)
);

ALTER TABLE <table> ADD CONSTRAINT chk_<table>_is_deleted
  CHECK (is_deleted IN (0, 1));
```

> `is_deleted` + `deleted_at` are the **minimum** the professor asked for; `deleted_by` is
> added for auditing (we already use `created_by`, so the symmetry is worth keeping).

## 4. Partial unique constraints

Verified against Oracle: the **only** real `UNIQUE` constraints (besides PKs) are:

| Table | Constraint | Column |
|---|---|---|
| `USERS` | `UK_USERS_EMAIL` | `email` |
| `JOB_POSITIONS` | `UK_JOB_POSITION_NUMBER` | `job_position_number` |

The organization tables (`AREAS`, `DEPARTMENTS`, `SECTIONS`, `UNITS`) have **no** DB-level
`UNIQUE` on name — name uniqueness is enforced **only in app code** (`existsByName`).

Implication: with soft delete, a **deleted** unique value must become reusable, so uniqueness
must apply **only among active rows**.

- **`USERS.EMAIL` (required):** the real constraint would block reusing a deleted user's
  email. It must be **replaced** with a partial unique index.
- **Organization (optional):** there's no constraint to drop; it's enough for `existsByName`
  to filter `is_deleted = 0`. If DB-level integrity is also desired, partial unique indexes
  can be added (see Section 3 of the migration, **scope to be confirmed**: area global,
  dept/section per area, unit per parent).

Oracle technique (function-based unique index — Oracle does not index `NULL` keys, so deleted
rows fall out of the index):

```sql
-- USERS.EMAIL: covers active rows only (deleted -> NULL -> outside the index)
CREATE UNIQUE INDEX ux_users_email_active
  ON USERS (CASE WHEN is_deleted = 0 THEN EMAIL END);
```

> The concrete migration lives in `SIGECAT-DB-SOFT-DELETE.sql` (repo root).

## 5. Reactivation (case to watch)

If we later allow **reactivating** a deleted entity, we must validate **before** setting
`is_deleted = 0` that no **active** entity already holds the same unique value. If one exists,
return a conflict (`409`) and do not reactivate.

> Exposing a reactivation endpoint is not required for this delivery, but the validation is
> documented so the partial unique index isn't broken when it's implemented.

## 6. Delete cascade

Marking order on deletion (all inside **a single transaction**):

```
Area deleted
 ├─ Area's departments       → is_deleted = 1
 │   └─ Department's units     → is_deleted = 1  → de-reference plazas (§7)
 └─ Area's sections           → is_deleted = 1
     └─ Section's units        → is_deleted = 1 → de-reference plazas (§7)
 └─ Area's plazas             → is_deleted = 1  (cascade, §7)
```

- Deleting a **department** or **section** → marks its child **units** and de-references the
  plazas that pointed to them (`DEPARTMENT_ID`/`SECTION_ID`/`UNIT_ID = NULL`).
- Deleting a **unit** → de-references the plazas (`UNIT_ID = NULL`).
- Deleting an **area** → full cascade: the area's departments, sections, units **and plazas**
  are marked `is_deleted = 1` (plazas can't de-reference because `AREA_ID` is NOT NULL).
- Reuse `hasChildEntities()` to **find** the children to mark (no longer to block).

## 7. Floating plazas (real model)

Verified against Oracle. The "plaza" is the **`JOB_POSITIONS`** table, not a column on
`USERS`. Real relationships:

```
JOB_POSITIONS
  JOB_POSITION_ID       PK
  AREA_ID         NOT NULL → AREAS         (every plaza ALWAYS belongs to an area)
  DEPARTMENT_ID   NULL     → DEPARTMENTS   (optional)
  SECTION_ID      NULL     → SECTIONS      (optional)
  UNIT_ID         NULL     → UNITS         (optional)
  USER_ID         NULL     → USERS         (plaza holder; NULL = vacant)
  JOB_POSITION_NUMBER       (= the "plaza_number" the client sends)
```

Conclusions:

- **The user does NOT point to the plaza; the plaza points to the user** (`JOB_POSITIONS.USER_ID`).
  Nothing needs to be cleared on `USERS` when deleting organization entities.
- What can be "left floating" is the **plaza**: deleting a unit/section/dept/area would leave
  its plazas pointing at something deleted.

Since `AREA_ID` is **NOT NULL** and the other levels are **nullable**, the schema lets a plaza
survive re-anchored to a higher level. Handling on deletion:

| Deleted | Action on referencing `JOB_POSITIONS` |
|---|---|
| **Unit** | `UNIT_ID = NULL` → the plaza re-anchors to its dept/section/area. Clean. |
| **Section** | `SECTION_ID = NULL` (and `UNIT_ID = NULL` on child units deleted in cascade). |
| **Department** | `DEPARTMENT_ID = NULL` (same for child units). |
| **Area** | `AREA_ID` is NOT NULL → can't de-reference → **cascade: soft-delete the plaza** (decided below). |

### Decision made: deleting an area with plazas → Option B (cascade)

Because `AREA_ID` is mandatory, a plaza can't survive without an area. **Team decision:**

- ✅ **Option B — Cascade to plazas:** deleting an area also **soft-deletes its plazas**. This
  requires `JOB_POSITIONS` to **enter the soft-delete scope** (`is_deleted`/`deleted_at`/`deleted_by`)
  → already included in the migration (Section 4).
- ❌ Option A (block) discarded.

Final per-level policy:

| Deleted | Action on plazas (`JOB_POSITIONS`) |
|---|---|
| **Unit** | `UNIT_ID = NULL` → plaza re-anchors to its dept/section/area. Survives. |
| **Section** | `SECTION_ID = NULL` (+ `UNIT_ID = NULL` on child units). Survives re-anchored to the area. |
| **Department** | `DEPARTMENT_ID = NULL` (+ `UNIT_ID = NULL` on child units). Survives re-anchored to the area. |
| **Area** | **Soft-delete the plaza** (`is_deleted = 1`), since it can't re-anchor. |

> This way no plaza is left floating: at lower levels it re-anchors upward; at the area level
> it's soft-deleted along with everything else. The plaza **holder** (user) is never deleted;
> they just lose the assignment when their plaza is removed.

> Note: the `plaza_number` the client sends to `PATCH /users/me` (`updatePlaza`) **has no
> matching column on `USERS`** — the real data lives in `JOB_POSITIONS.JOB_POSITION_NUMBER`
> and is assigned via `USER_ID`. This is a client↔API mismatch separate from this design, but
> worth noting so we don't build plaza cleanup on a non-existent field.

## 8. Repository changes

**Reads** (`findById`, `findAll`, `getAreas`, `countAreas`, `existsByName`, etc.): add the
active-rows filter by default.

```sql
... WHERE is_deleted = 0 ...
```

**Delete**: replace `DELETE FROM ...` with the logical flag.

```sql
UPDATE <table>
   SET is_deleted = 1,
       deleted_at = CURRENT_TIMESTAMP,
       deleted_by = :deleted_by
 WHERE <id> = :id
   AND is_deleted = 0;
```

**Uniqueness** (`existsByName`): count active rows only (`AND is_deleted = 0`) — consistent
with the partial unique index in §4.

## 9. `index` and `show` endpoint changes

`GET /<resource>` (index) and `GET /<resource>/{id}` (show) must allow filtering by state.

Proposed query parameter:

| `?status=` | Returns |
|---|---|
| `active` (default) | Only `is_deleted = 0` |
| `deleted` | Only `is_deleted = 1` |
| `all` | Everything |

- **Default = `active`** to avoid breaking current clients.
- `show` of a deleted entity with `status=active` → `404`.
- An invalid `status` value → `400` (`invalidField('status')`).
- **Authorization:** any authenticated user may read active rows; seeing deleted rows
  (`status=deleted|all`) requires **admin** (`403` otherwise). All writes — create, update,
  soft-delete and restore — are **admin-only**.

**Reactivation** (decided to ship — see §12): `POST /<resource>/{id}/restore` flips
`is_deleted` back to `0`, after validating the §5 conflict rule. Implemented for Area as
`POST /areas/{id}/restore`.

## 10. Reverting the block in Area

`AreaService::deleteArea()` used to throw a conflict if children existed. Under the new policy
**that block is removed**: instead of blocking, it runs the cascade from §6 (done).

## 11. Per-entity checklist

Each owner applies the same pattern to their entity:

- [ ] SQL migration: `is_deleted`, `deleted_at`, `deleted_by` + `CHECK`.
- [ ] Partial unique index on the unique column(s).
- [ ] Repository: reads with `WHERE is_deleted = 0`.
- [ ] Repository: `delete()` → `UPDATE ... SET is_deleted = 1`.
- [ ] Service: cascade to children inside a transaction.
- [ ] Service: uniqueness counts active rows only.
- [ ] `index`/`show` endpoints: `status` parameter.
- [ ] (Unit/Section/Dept) de-reference plazas that pointed to the deleted entity (§7).

| Entity | Owner | Status |
|---|---|---|
| USERS | _unassigned_ | pending |
| AREAS | _unassigned_ | **done — reference implementation** |
| DEPARTMENTS | _unassigned_ | repository soft-delete ready (no controller/routes yet) |
| SECTIONS | _unassigned_ | pending (entity not built yet) |
| UNITS | _unassigned_ | pending (entity not built yet) |
| JOB_POSITIONS | _unassigned_ | pending (entity not built yet) |

> **Reference:** Area is fully implemented end-to-end (repository + service +
> controller + routes) and should be copied as the pattern for the rest. Department's
> repository is soft-delete ready but has no controller/service/routes yet, so its
> endpoints can't be wired until that entity is built.

## 12. Decisions (all resolved)

1. ✅ **user↔plaza link**: it's `JOB_POSITIONS.USER_ID`, not a column on `USERS`. See §7.
2. ✅ **deleting an area with plazas**: Option B (cascade to plazas). See §7.
3. ✅ **`JOB_POSITIONS` in scope**: yes. Migration Section 4 active.
4. ✅ **`deleted_by`**: included (symmetry with `created_by`). If the professor wants the bare
   minimum, drop the `deleted_by` columns/FKs.
5. ✅ **Reactivation endpoint**: ships this delivery. `POST /<resource>/{id}/restore` with the
   §5 conflict validation. Implemented for Area.
6. ✅ **`status=deleted`/`all`**: only **admins** can see deleted rows via `?status=`. Default
   stays `active`. Soft-delete and restore are also admin-only.
