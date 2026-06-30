# Contributing to SIGECAT

## Language convention

The project uses **two languages with distinct roles**:

| Context | Language | Examples |
|---|---|---|
| Source code | **English** | variable names, function names, types, class names |
| Code comments | **English** | `// Load areas once`, `/** Returns the active user. */` |
| Git commits | **English** | `fix(auth): handle expired token on refresh` |
| Pull request titles and bodies | **English** | see PR history |
| User interface | **Spanish** | button labels, form placeholders, error messages, snackbar text |
| Domain terms in comments | Spanish OK in quotes | `// Frequency options for JOB_FUNCTIONS.frequency ("Período")` |

### Why

The codebase and its tooling (PHP, TypeScript, MUI) are English-centric, so
keeping code and comments in English keeps them consistent with library docs and
IDE tooling. The UI is in Spanish because the system is for UCR staff.

### In practice

- **Variables and functions**: always English — `loadSections`, `isSubmitting`,
  `buildFilterConditions`.
- **Comments**: English prose. Domain-specific nouns that appear in the UI (e.g.
  "Declaración", "Plaza", "Período") may appear in quotes when referring to a
  specific UI label, but the surrounding sentence should be English.
- **String literals shown to users**: Spanish — error messages, snackbar
  feedback, labels. These live in the JSX / PHP Response calls, not in comments.
- **Docblocks** (`/** */` in PHP, TSDoc in TypeScript): English.

## Branch and PR workflow

- Branch from the latest `staging`. If your branch predates a merged cleanup PR,
  run `git merge origin/staging` before pushing to keep CI green.
- One PR per logical change; base branch is `staging`.
- CI runs `npm run lint` + `npm run build` (frontend) and PHPStan level 8
  (backend) on every PR. Staging requires one review approval before merging.
- Verify locally before pushing:
  - Frontend: `npm run lint && npm run build && npm test`
  - Backend: `vendor/bin/phpunit` and `vendor/bin/phpstan analyse`

## Migrations

New Oracle schema changes go into `migrations/NNNN_description.sql` (see
`migrations/README.md`). Apply them locally with:

```bash
cd api && php bin/migrate.php migrate
```

## Secrets

`config/oci_config.php`, the Oracle wallet and any `.env` file are gitignored
and must never be committed. Copy `api/.env.example` / `client/.env.example` to
understand what each deployment needs.
