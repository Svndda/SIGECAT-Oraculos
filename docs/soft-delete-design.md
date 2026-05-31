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
3. **La plaza no queda flotante:** al eliminar la unidad/plaza de un usuario, se limpia la
   referencia del usuario para que no apunte a algo eliminado.

Aplica a las tablas de **usuarios** y de **organización** (`AREAS`, `DEPARTMENTS`,
`SECTIONS`, `UNITS`).

## 2. Estado actual (a corregir)

El borrado hoy es **inconsistente**:

| Lugar | Comportamiento actual | Problema |
|---|---|---|
| `AreaService::deleteArea()` | **Bloquea** si hay hijos + **hard delete** (`DELETE FROM AREAS`) | Contradice la cascada; es borrado físico |
| `AreaRepository::hasChildEntities()` | Cuenta hijos para bloquear | Ya no se usa para bloquear; se reaprovecha para cascada |
| `DepartmentRepository::delete()` | **Hard delete** sin guarda | Borrado físico |
| `UNITS` / `SECTIONS` | Sin lógica de borrado aún | Implementar directo como soft delete |
| `USERS` | Tiene `is_active` pero no marca de borrado | Agregar marca de borrado |

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
 │   └─ Unidades del depto    → is_deleted = 1  → limpiar plaza de usuarios (§7)
 └─ Secciones del área        → is_deleted = 1
     └─ Unidades de la sección → is_deleted = 1 → limpiar plaza de usuarios (§7)
```

- Borrar **departamento** o **sección** → marca sus **unidades** hijas.
- Borrar **unidad** → dispara la limpieza de plaza del usuario (§7).
- Reaprovechar `hasChildEntities()` para **encontrar** los hijos a marcar (ya no para
  bloquear).

## 7. Plaza huérfana

Al marcar una **unidad** como eliminada, ningún usuario debe quedar apuntando a ella.

**Política propuesta (a confirmar con el equipo):** limpiar la referencia — poner en `NULL`
el campo de plaza/unidad del usuario afectado, dejándolo **activo pero sin plaza**. El
usuario no se elimina; solo pierde la asignación.

```sql
UPDATE USERS
   SET plaza_number = NULL          -- (confirmar nombre exacto de la columna de plaza/unidad)
 WHERE plaza_number = :unit_id
   AND is_deleted = 0;
```

> ⚠️ **Supuesto a confirmar:** la relación usuario↔unidad en el código va por `plaza_number`
> / `job_class_id`. Hay que confirmar cuál columna enlaza al usuario con la unidad antes de
> implementar esta limpieza.

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
- [ ] (Unidad) limpieza de plaza en usuarios afectados.

| Entidad | Responsable | Estado |
|---|---|---|
| USERS | _por asignar_ | pendiente |
| AREAS | _por asignar_ | pendiente |
| DEPARTMENTS | _por asignar_ | pendiente |
| SECTIONS | _por asignar_ | pendiente |
| UNITS | _por asignar_ | pendiente |

## 12. Supuestos a confirmar antes de implementar

1. **Columna de plaza/unidad en `USERS`**: confirmar si el enlace es `plaza_number`,
   `job_class_id` u otra, para la limpieza de §7.
2. **`deleted_by`**: confirmar si lo incluimos (recomendado) o si el profe pide solo el
   mínimo (`is_deleted`, `deleted_at`).
3. **Endpoint de reactivación**: decidir si entra en esta entrega o queda documentado para
   después (§5).
4. **`status=deleted`/`all`**: confirmar si el admin necesita ver eliminados en esta entrega
   o si solo filtramos a activos por ahora.
