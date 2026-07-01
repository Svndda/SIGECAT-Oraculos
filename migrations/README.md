# Database migrations

Ordered SQL migrations for the SIGECAT Oracle schema, applied by
`api/bin/migrate.php`. The runner records every applied file in the
`SCHEMA_MIGRATIONS` table, so each migration runs exactly once and the database
state is reproducible.

## Naming

Files are named `NNNN_short-description.sql`, where `NNNN` is a zero-padded
sequence number. Migrations are applied in filename order, so the prefix defines
the order. Add a new migration with the next number:

```
0016_add-something.sql
```

## Writing a migration

- Plain DDL statements end with `;`.
- PL/SQL blocks (procedures, functions, triggers, anonymous `DECLARE/BEGIN`)
  end with a line containing only `/`, SQL*Plus style. The runner uses that to
  tell a PL/SQL block apart from regular statements.
- Each file should be self-contained and document its purpose in a header
  comment.

## Running

From the `api/` directory (DB credentials come from the environment or
`config/oci_config.php`, same as the app):

```bash
php bin/migrate.php status     # list applied and pending migrations
php bin/migrate.php migrate    # apply every pending migration, in order
php bin/migrate.php baseline   # mark all current migrations as applied
                               # WITHOUT running them
```

### Adopting on an existing database

A database that already has the schema (applied before this runner existed)
should be **baselined once** so the runner does not try to re-apply migrations
that are already in place:

```bash
php bin/migrate.php baseline
```

After that, only genuinely new migrations are pending and `migrate` applies them.

## Note on the base schema

These files are incremental changes on top of the base schema (table creation,
seed data), which is provisioned separately and not stored here. On a brand-new
database, create the base schema first, then run `migrate`.
