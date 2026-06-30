# SIGECAT

Workload and work-shift declaration management system for the University of
Costa Rica. Employees declare the functions, licenses and rest periods of their
shift, while administrative staff manage the organizational structure (areas,
departments, sections, units, jobs and positions) and the related catalogues.

## Architecture

The project is a monorepo with two independently deployable components:

- **`client/`** — React 19 + TypeScript SPA, built with Vite and Material UI.
  Talks to the API over HTTP (Axios) and exports declarations to PDF.
- **`api/`** — Framework-less REST API in PHP 8.4 on Oracle Database. It uses a
  small custom router, thin controllers, services for business logic, and
  repositories backed by prepared statements (PDO/OCI).

Authentication is token-based (Bearer in `Authorization`, refresh token in the
body); the frontend keeps tokens in `sessionStorage`. The roles are `admin` and
`employee`.

## Repository layout

```
client/                 SPA (React + TypeScript + Vite)
  src/features/         Domain views (admin, employee)
  src/services/         API HTTP clients
api/                    REST API (PHP + Oracle)
  src/Controllers/      HTTP layer
  src/Services/         Business logic
  src/Repositories/     Data access (PDO, prepared statements)
  config/routes.php     Route definitions
  tests/                Test suite (see api/tests/README.md)
docs/                   User manual and design notes
SIGECAT-DB-*.sql        Database schema and migrations
```

## Requirements

- Node.js 20+
- PHP 8.4 with the `pdo_oci` extension
- Oracle Instant Client 21+ and the database connection wallet

`pdo_oci` was removed from PHP core in 8.4; the `setup-pdo-oci.sh` script builds
and installs the PECL version. The Instant Client, the wallet and
`config/oci_config.php` are local and not versioned (they hold credentials).

## Getting started

Install dependencies:

```bash
cd client && npm install
cd ../api && composer install
```

Run the frontend and API together (from `client/`):

```bash
npm run dev:full
```

Or separately:

```bash
npm run dev   # SPA at http://localhost:5173
npm run api   # API at http://localhost:8000
```

## Database

The schema and its changes are kept as SQL scripts at the repository root
(`SIGECAT-DB-*.sql`). Migrations are applied in chronological order against the
Oracle instance; each file documents its purpose in the header. Database-side
business logic (procedures and triggers) lives in
`SIGECAT-DB-ROUTINES-business-logic.sql` and is described in
`docs/db-business-logic-routines.md`.

## Testing and quality

```bash
# Frontend
cd client && npm run lint && npm run build

# Backend (the API must be running for the HTTP tests)
cd api && php tests/run_all.php
```

The backend includes static analysis with PHPStan (`api/phpstan.neon`).
Continuous integration runs the frontend lint/build and PHPStan on every pull
request.

## Security

- Passwords hashed with `bcrypt`; strength validation on registration.
- Random tokens stored as hashes; short-lived access token with refresh-token
  rotation.
- Per-IP rate limiting on authentication and password recovery.
- Temporary account lockout after failed attempts, with automatic release.
- Data access exclusively through prepared statements.

## Documentation

- `docs/manual-usuario.md` — user manual (administrator and employee).
- `docs/soft-delete-design.md`, `docs/password-hashing.md` — design notes.
- `api/tests/README.md` — how to run and configure the test suite.
