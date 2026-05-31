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
   (`JOB_POSITIONS`) que la referencian no deben quedar apuntando a algo eliminado (ver §7
   para el modelo real, que difiere de lo que se asumió al inicio).

Aplica a las tablas de **usuarios** y de **organización** (`AREAS`, `DEPARTMENTS`,
`SECTIONS`, `UNITS`). El tratamiento de las **plazas** (`JOB_POSITIONS`) es una decisión
pendiente — ver §7.

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

Hoy un nombre de área es único globalmente. Con soft delete, un nombre **eliminado** debe
poder reutilizarse. La unicidad debe aplicar **solo entre filas activas**.

Técnica en Oracle (índice único basado en función — Oracle no indexa `NULL`, así que las
filas eliminadas quedan fuera del índice):

```sql
-- Ejemplo para AREAS (repetir el patrón por entidad con su columna única)
CREATE UNIQUE INDEX ux_areas_name_active
  ON AREAS (CASE WHEN is_deleted = 0 THEN UPPER(name) END);
```

Con esto:
- Dos áreas **activas** no pueden compartir nombre.
- Un área **eliminada** y una **activa** sí pueden compartir nombre.
- Se libera el nombre al eliminar (soft) un área.

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
 └─ Plazas del área           → ver decisión §7 (bloquear o cascada)
```

- Borrar **departamento** o **sección** → marca sus **unidades** hijas y des-referencia las
  plazas que apuntaban a ellas (§7).
- Borrar **unidad** → des-referencia las plazas (`UNIT_ID = NULL`).
- Borrar **área** → ver decisión pendiente de §7 (las plazas no pueden des-referenciar el
  área porque `AREA_ID` es NOT NULL).
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
| **Área** | ⚠️ `AREA_ID` es NOT NULL → **no se puede des-referenciar**. Hay que **decidir** (ver abajo). |

### Decisión pendiente: borrar un área con plazas

Al ser `AREA_ID` obligatorio, borrar un área deja dos caminos. **A confirmar con profe/equipo:**

- **Opción A — Bloquear:** no permitir borrar un área si tiene plazas activas; el admin
  primero reasigna o elimina esas plazas. Más simple y seguro.
- **Opción B — Cascada a plazas:** soft-delete también de las plazas del área. Requiere que
  `JOB_POSITIONS` **entre al alcance del soft-delete** (agregarle `is_deleted`/`deleted_at`),
  lo cual hoy **no estaba** en la lista del equipo (solo USERS + organización).

> ⚠️ **Alcance:** `JOB_POSITIONS` no estaba contemplado en el alcance inicial. Si el profe
> insiste en "soft delete de **todo**", las plazas deberían incluirse y conviene agregarlas a
> la migración y a la cascada. **Decisión de equipo.**

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

## 12. Decisiones a confirmar antes de implementar

1. ✅ **RESUELTO — enlace usuario↔plaza**: es `JOB_POSITIONS.USER_ID`, no una columna de
   `USERS`. Ver §7.
2. **Borrar área con plazas** (§7): Opción A (bloquear) vs Opción B (cascada a plazas).
   **Decisión de negocio / profe.**
3. **`JOB_POSITIONS` en el alcance del soft-delete**: ¿se le agrega `is_deleted` también?
   Depende de qué tan literal sea el "soft delete de todo". **Decisión de equipo.**
4. **`deleted_by`**: incluirlo (recomendado, simetría con `created_by`) vs solo el mínimo
   (`is_deleted`, `deleted_at`).
5. **Endpoint de reactivación**: ¿entra en esta entrega o queda documentado para después (§5)?
6. **`status=deleted`/`all`**: ¿el admin necesita ver eliminados en esta entrega o solo
   filtramos a activos por ahora?
