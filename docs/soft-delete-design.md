# Diseño: Soft Delete para Usuarios y Organización

> Decision record del equipo. Fija la política de borrado para esta entrega y el
> plan técnico que **todos** debemos seguir para que las entidades queden consistentes.

## 1. Decisión

Resolución del profesor:

> "Se realiza un **soft delete de todo**. En teoría esos casos no se deberían ver.
> Pero si se elimina la plaza **no debería quedar flotante**."

Por lo tanto:

1. **Ningún borrado es físico.** Se reemplaza todo `DELETE FROM ...` por una marca lógica.
2. **El borrado de un padre arrastra (cascada) a sus hijos** — borrar un área marca como
   eliminadas sus secciones/departamentos, y estos a sus unidades.
3. **Las plazas no quedan flotantes:** al eliminar una entidad de organización, las plazas
   (`JOB_POSITIONS`) que la referencian re-anclan al nivel superior o se eliminan en cascada
   (cuando se borra el área). Ver §7.

Aplica a las tablas de **usuarios**, de **organización** (`AREAS`, `DEPARTMENTS`,
`SECTIONS`, `UNITS`) y de **plazas** (`JOB_POSITIONS`, incorporada al alcance — ver §7).

## 2. Estado actual (a corregir)

El borrado hoy es **inconsistente**:

| Lugar | Comportamiento actual | Problema |
|---|---|---|
| `AreaService::deleteArea()` | **Bloquea** si hay hijos + **hard delete** (`DELETE FROM AREAS`) | Contradice la cascada; es borrado físico |
| `AreaRepository::hasChildEntities()` | Cuenta hijos para bloquear | Ya no se usa para bloquear; se reaprovecha para cascada |
| `DepartmentRepository::delete()` | **Hard delete** sin guarda | Borrado físico |
| `UNITS` / `SECTIONS` | Sin lógica de borrado aún | Implementar directo como soft delete |
| `USERS` | Tiene `is_active` pero no marca de borrado | Agregar marca de borrado |
| `JOB_POSITIONS` (plazas) | Sin lógica de borrado; referencia área/unidad/depto/sección y usuario | Decidir tratamiento (§7) |

> **`is_active` ≠ `is_deleted`** en `USERS`: `is_active` = cuenta habilitada/deshabilitada
> (login); `is_deleted` = registro eliminado del sistema. Son conceptos distintos y deben
> coexistir como columnas separadas.

## 3. Cambios de schema (Oracle)

Agregar a **cada** tabla (`USERS`, `AREAS`, `DEPARTMENTS`, `SECTIONS`, `UNITS`):

```sql
ALTER TABLE <tabla> ADD (
  is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,   -- 0 = activo, 1 = eliminado
  deleted_at  TIMESTAMP  NULL,                  -- cuándo se eliminó
  deleted_by  CHAR(26)   NULL                   -- ULID del usuario que eliminó (auditoría)
);

ALTER TABLE <tabla> ADD CONSTRAINT chk_<tabla>_is_deleted
  CHECK (is_deleted IN (0, 1));
```

> `is_deleted` + `deleted_at` son el **mínimo** que pidió el profe; `deleted_by` se agrega
> para auditoría (ya manejamos `created_by`, conviene la simetría).

## 4. Restricciones únicas parciales

Verificado contra Oracle: las **únicas** constraints `UNIQUE` reales (aparte de las PK) son:

| Tabla | Constraint | Columna |
|---|---|---|
| `USERS` | `UK_USERS_EMAIL` | `email` |
| `JOB_POSITIONS` | `UK_JOB_POSITION_NUMBER` | `job_position_number` |

Las tablas de organización (`AREAS`, `DEPARTMENTS`, `SECTIONS`, `UNITS`) **no** tienen
`UNIQUE` de nombre a nivel DB — la unicidad de nombre se valida **solo en código**
(`existsByName`).

Implicación: con soft delete, un valor único **eliminado** debe poder reutilizarse, así que
la unicidad debe aplicar **solo entre filas activas**.

- **`USERS.EMAIL` (obligatorio):** la constraint real bloquearía reutilizar el email de un
  usuario borrado. Hay que **reemplazarla** por un índice único parcial.
- **Organización (opcional):** no hay constraint que romper; basta con que `existsByName`
  filtre `is_deleted = 0`. Si además se quiere integridad a nivel DB, se pueden agregar
  índices únicos parciales (ver Section 3 de la migración, **con el alcance por confirmar**:
  área global, depto/sección por área, unidad por padre).

Técnica en Oracle (índice único basado en función — Oracle no indexa claves `NULL`, así que
las filas eliminadas quedan fuera del índice):

```sql
-- USERS.EMAIL: solo cubre filas activas (deleted -> NULL -> fuera del índice)
CREATE UNIQUE INDEX ux_users_email_active
  ON USERS (CASE WHEN is_deleted = 0 THEN EMAIL END);
```

> La migración concreta está en `SIGECAT-DB-SOFT-DELETE.sql` (raíz del repo).

## 5. Reactivación (caso a vigilar)

Si en el futuro permitimos **reactivar** una entidad eliminada, hay que validar **antes**
de poner `is_deleted = 0` que no exista ya una entidad **activa** con el mismo valor único.
Si existe, devolver conflicto (`409`) y no reactivar.

> Para esta entrega no es obligatorio exponer un endpoint de reactivación, pero la
> validación queda documentada para no romper el índice único parcial cuando se implemente.

## 6. Cascada de borrado

Orden de marcado al eliminar (todo dentro de **una transacción**):

```
Área eliminada
 ├─ Departamentos del área   → is_deleted = 1
 │   └─ Unidades del depto    → is_deleted = 1  → des-referenciar plazas (§7)
 └─ Secciones del área        → is_deleted = 1
     └─ Unidades de la sección → is_deleted = 1 → des-referenciar plazas (§7)
 └─ Plazas del área           → is_deleted = 1  (cascada, §7)
```

- Borrar **departamento** o **sección** → marca sus **unidades** hijas y des-referencia las
  plazas que apuntaban a ellas (`DEPARTMENT_ID`/`SECTION_ID`/`UNIT_ID = NULL`).
- Borrar **unidad** → des-referencia las plazas (`UNIT_ID = NULL`).
- Borrar **área** → cascada completa: departamentos, secciones, unidades **y plazas** del
  área se marcan `is_deleted = 1` (las plazas no pueden des-referenciar porque `AREA_ID` es
  NOT NULL).
- Reaprovechar `hasChildEntities()` para **encontrar** los hijos a marcar (ya no para
  bloquear).

## 7. Plazas flotantes (modelo real)

Verificado contra Oracle. La "plaza" es la tabla **`JOB_POSITIONS`**, no una columna de
`USERS`. Relaciones reales:

```
JOB_POSITIONS
  JOB_POSITION_ID       PK
  AREA_ID         NOT NULL → AREAS         (toda plaza cuelga SIEMPRE de un área)
  DEPARTMENT_ID   NULL     → DEPARTMENTS   (opcional)
  SECTION_ID      NULL     → SECTIONS      (opcional)
  UNIT_ID         NULL     → UNITS         (opcional)
  USER_ID         NULL     → USERS         (titular de la plaza; NULL = vacante)
  JOB_POSITION_NUMBER       (= el "plaza_number" que manda el cliente)
```

Conclusiones:

- **El usuario NO apunta a la plaza; la plaza apunta al usuario** (`JOB_POSITIONS.USER_ID`).
  No hay nada que limpiar en `USERS` al borrar organización.
- Lo que puede "quedar flotante" es la **plaza**: al borrar una unidad/sección/depto/área,
  las plazas que la referencian apuntarían a algo eliminado.

Como `AREA_ID` es **NOT NULL** y los demás niveles son **NULL-ables**, el schema permite que
una plaza viva re-anclada a un nivel superior. Tratamiento propuesto al borrar:

| Se borra | Acción sobre `JOB_POSITIONS` que la referencian |
|---|---|
| **Unidad** | `UNIT_ID = NULL` → la plaza re-ancla a su depto/sección/área. Limpio. |
| **Sección** | `SECTION_ID = NULL` (y `UNIT_ID = NULL` en unidades hijas borradas en cascada). |
| **Departamento** | `DEPARTMENT_ID = NULL` (idem unidades hijas). |
| **Área** | `AREA_ID` es NOT NULL → no se puede des-referenciar → **cascada: soft-delete de la plaza** (decisión tomada abajo). |

### Decisión tomada: borrar un área con plazas → Opción B (cascada)

Al ser `AREA_ID` obligatorio, una plaza no puede sobrevivir sin área. **Decisión del equipo:**

- ✅ **Opción B — Cascada a plazas:** al borrar un área se hace **soft-delete también de sus
  plazas**. Esto requiere que `JOB_POSITIONS` **entre al alcance del soft-delete**
  (`is_deleted`/`deleted_at`/`deleted_by`) → ya incluido en la migración (Section 4).
- ❌ Opción A (bloquear) descartada.

Resumen de la política final por nivel:

| Se borra | Acción sobre las plazas (`JOB_POSITIONS`) |
|---|---|
| **Unidad** | `UNIT_ID = NULL` → la plaza re-ancla a su depto/sección/área. Sobrevive. |
| **Sección** | `SECTION_ID = NULL` (+ `UNIT_ID = NULL` en unidades hijas). Sobrevive re-anclada al área. |
| **Departamento** | `DEPARTMENT_ID = NULL` (+ `UNIT_ID = NULL` en unidades hijas). Sobrevive re-anclada al área. |
| **Área** | **Soft-delete de la plaza** (`is_deleted = 1`), porque no puede re-anclar. |

> Así ninguna plaza queda flotante: en los niveles inferiores re-ancla hacia arriba; en el
> nivel de área, se elimina (soft) junto con todo. El **usuario** titular nunca se borra; solo
> pierde la asignación cuando su plaza se elimina.

> Nota: el `plaza_number` que el cliente envía a `PATCH /users/me` (`updatePlaza`) **no tiene
> columna correspondiente en `USERS`** — el dato real vive en `JOB_POSITIONS.JOB_POSITION_NUMBER`
> y se asigna vía `USER_ID`. Esto es un desajuste cliente↔API aparte de este diseño, pero
> conviene anotarlo para no construir la limpieza de plaza sobre un campo inexistente.

## 8. Cambios en repositorios

**Lecturas** (`findById`, `findAll`, `getAreas`, `countAreas`, `existsByName`, etc.):
agregar por defecto el filtro de activos.

```sql
... WHERE is_deleted = 0 ...
```

**Borrado**: reemplazar `DELETE FROM ...` por la marca lógica.

```sql
UPDATE <tabla>
   SET is_deleted = 1,
       deleted_at = CURRENT_TIMESTAMP,
       deleted_by = :deleted_by
 WHERE <id> = :id
   AND is_deleted = 0;
```

**Unicidad** (`existsByName`): contar solo activos (`AND is_deleted = 0`) — coherente con el
índice único parcial de §4.

## 9. Cambios en endpoints `index` y `show`

`GET /<recurso>` (index) y `GET /<recurso>/{id}` (show) deben permitir filtrar por estado.

Parámetro de query propuesto:

| `?status=` | Devuelve |
|---|---|
| `active` (default) | Solo `is_deleted = 0` |
| `deleted` | Solo `is_deleted = 1` |
| `all` | Todo |

- **Default = `active`** para no romper a los clientes actuales.
- `show` de una entidad eliminada con `status=active` → `404`.

## 10. Reversión del bloqueo en Area

`AreaService::deleteArea()` actualmente lanza conflicto si hay hijos. Con la nueva política
**eso se elimina**: en lugar de bloquear, se ejecuta la cascada de §6.

## 11. Checklist por entidad

Cada responsable aplica el mismo patrón en su entidad:

- [ ] Migración SQL: `is_deleted`, `deleted_at`, `deleted_by` + `CHECK`.
- [ ] Índice único parcial sobre la(s) columna(s) única(s).
- [ ] Repositorio: lecturas con `WHERE is_deleted = 0`.
- [ ] Repositorio: `delete()` → `UPDATE ... SET is_deleted = 1`.
- [ ] Servicio: cascada a hijos dentro de transacción.
- [ ] Servicio: unicidad cuenta solo activos.
- [ ] Endpoints `index`/`show`: parámetro `status`.
- [ ] (Unidad/Sección/Depto) des-referenciar plazas que apuntaban a la entidad borrada (§7).

| Entidad | Responsable | Estado |
|---|---|---|
| USERS | _por asignar_ | pendiente |
| AREAS | _por asignar_ | pendiente |
| DEPARTMENTS | _por asignar_ | pendiente |
| SECTIONS | _por asignar_ | pendiente |
| UNITS | _por asignar_ | pendiente |
| JOB_POSITIONS | _por asignar_ | pendiente |

## 12. Decisiones a confirmar antes de implementar

1. ✅ **RESUELTO — enlace usuario↔plaza**: es `JOB_POSITIONS.USER_ID`, no una columna de
   `USERS`. Ver §7.
2. ✅ **RESUELTO — borrar área con plazas**: Opción B (cascada a plazas). Ver §7.
3. ✅ **RESUELTO — `JOB_POSITIONS` en el alcance**: sí entra. Migración Section 4 activa.
4. **`deleted_by`**: incluido (simetría con `created_by`). Si el profe pide solo el mínimo,
   se quitan las columnas/FK de `deleted_by`.
5. **Endpoint de reactivación**: ¿entra en esta entrega o queda documentado para después (§5)?
6. **`status=deleted`/`all`**: ¿el admin necesita ver eliminados en esta entrega o solo
   filtramos a activos por ahora?
