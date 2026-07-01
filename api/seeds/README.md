# Seeds

Scripts that populate the database with demo/presentation data. They reuse the
app's own helpers (ULID generator, bcrypt hashing, `CLIENT.*` stored functions)
so seeded rows respect every business rule and trigger.

## `demo_seed.php`

Creates a self-contained demo dataset so **every admin CRUD shows data**:

- **5 users** (1 admin + 4 employees), all `@ucr.ac.cr`, with a known password.
- **Catalog top-up** (realistic rows): areas, departments, sections, units,
  jobs and license types.
- A **job position** assigned to each employee.
- **2 declarations per employee** across a couple of statuses.

Everything it creates is scoped to the demo users so it can be removed safely:

- users → `email` matches `demo.%@ucr.ac.cr`
- catalog rows + positions → `CREATED_BY` = the demo admin's id
- declarations / tokens → owned by a demo user

Existing (non-demo) data is never modified.

### Credentials

All demo users share one password, taken from the `DEMO_SEED_PASSWORD`
environment variable (so no secret lives in the repo). If it is not set, the
script generates a random password and **prints it** at the end of the run.

| Email | Role |
|-------|------|
| `demo.admin@ucr.ac.cr` | admin |
| `demo.ana@ucr.ac.cr` | employee |
| `demo.luis@ucr.ac.cr` | employee |
| `demo.sofia@ucr.ac.cr` | employee |
| `demo.marco@ucr.ac.cr` | employee |

### Running

Against the Docker stack (see `docker-compose.yml`):

```bash
# seed (idempotent — safe to run repeatedly); set a known password for the demo
docker compose exec -e DEMO_SEED_PASSWORD='<your-password>' api php /app/api/seeds/demo_seed.php

# remove demo data only
docker compose exec api php /app/api/seeds/demo_seed.php --purge
```

Running the API directly on the host instead:

```bash
DEMO_SEED_PASSWORD='<your-password>' php api/seeds/demo_seed.php
```

> The script is **idempotent**: it purges any previous demo rows before
> re-inserting, so re-running never duplicates data.
