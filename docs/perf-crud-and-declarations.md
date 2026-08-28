# Performance: admin CRUD lists and declarations

Sprint review feedback: not just the dashboard, every admin CRUD list and the
declarations list/detail flow felt slow. Measured against the real Oracle
Cloud dev DB (`php -S` dev server, admin token, `curl -w '%{time_total}'`).

## Root causes found

1. **Declarations list — severe N+1.** `DeclarationsService::enrichDeclarations`
   looked up job position, job, and (admin view) user **per row** — up to 3
   extra round trips per declaration on a page, on top of a **correlated
   subquery** in `DeclarationsRepository::findAllPaginated` re-evaluated per
   joined row to find each declaration's latest status. For a 10-row page this
   added up to roughly 30+ extra DB round trips.
2. **Every admin CRUD list** (`areas`, `departments`, `sections`, `units`,
   `users`, `official-functions`, `license-types`) ran the page query and the
   total-count query as **two separate round trips** to Oracle Cloud, whose
   network latency (not local disk I/O) dominates request time.
3. Several filter/sort columns (`name`, `email`, `created_at`) had no
   supporting index, forcing a full scan + sort as data grows.

## Fixes

- **Declarations:** replaced the correlated subquery with a
  `ROW_NUMBER() OVER (PARTITION BY DECLARATION_ID ORDER BY CREATED_AT DESC)`
  window (single pass, uses the existing `idx_declarations_status_decl`
  index), and replaced the per-row enrichment with 2–3 bulk
  `WHERE id IN (...)` queries (`JobPositionRepository::findByIds`,
  `JobRepository::findByIds`, `UserRepository::findByIds`) regardless of page
  size.
- **All 7 simple CRUD lists:** merged the count and data queries into one,
  using `COUNT(*) OVER() AS total_count` computed alongside each row, via a
  new shared `Repository::splitWindowedTotal()` helper. Cuts every list load
  from 2 round trips to 1.
- **New indexes** (`migrations/0017_crud-list-perf-indexes.sql`): function-based
  indexes on `UPPER(name)`/`UPPER(email)` filter columns and `created_at DESC`
  sort columns across `AREAS`, `DEPARTMENTS`, `SECTIONS`, `UNITS`, `USERS`,
  `OFFICIAL_FUNCTIONS`, `LICENSE_TYPES`, plus `user_id` on `REST_TIMES` and
  `LICENSE_TIMES`. Each statement is wrapped to ignore "already indexed"/"name
  already used" errors, so the migration is safe to re-run.

## Measured impact (10-row page, warm connection, 3 samples each)

| Endpoint | Before | After |
|---|---|---|
| `GET /declarations` (admin) | ~3.3–3.6s | ~1.0–1.5s |
| `GET /areas`, `/departments`, `/sections`, `/units`, `/users`, `/official-functions`, `/license-type` | ~0.6–0.9s | ~0.6–0.9s (halved round trips; Oracle Cloud connection/auth-check latency and sample jitter dominate the wall-clock floor) |

The declarations fix is the clear, large win — roughly 3x faster — because it
removed dozens of round trips, not just one. The CRUD list round-trip
reduction (2 → 1 query) is a real, verified architectural improvement, but
harder to see in wall-clock terms against this shared cloud DB's fixed
per-request latency floor; it will matter more as list result sets grow.

## Further work (not in this PR)

- Declarations could go from ~4–5 round trips (count + list + 2–3 bulk
  enrichment queries) down to 1 by joining job position/job/user directly
  into the main list query, at the cost of a larger, more complex SQL
  statement. Left out here to keep the fix's risk/complexity bounded.
- A proper load-testing tool (k6/ab) against a stable environment, rather
  than manual `curl` sampling against a live shared dev DB.
