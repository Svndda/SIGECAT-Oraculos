# API reference (OpenAPI)

The full API is described in [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0, all
endpoints). It is generated from `config/routes.php`; regenerate it when routes
change.

## Viewing it

- Paste the file into <https://editor.swagger.io>, or
- Open it with the **OpenAPI (Swagger) Editor** / **Redocly** VS Code extension, or
- Render a static page with Redocly:

  ```bash
  npx @redocly/cli preview-docs api/openapi.yaml   # interactive
  npx @redocly/cli build-docs api/openapi.yaml     # static HTML
  ```

## Conventions captured in the spec

- Responses use the envelope `{ data, meta, errors }`.
- `bearerAuth` (an access token from `POST /auth/login`) secures every endpoint
  except login, token refresh and password recovery.
- List endpoints accept `page`, `limit`, `filter`; soft-deletable resources also
  accept `status` (admin only).

> The spec documents every route with its method, tags, parameters, security and
> the standard responses. Per-field request/response body schemas are
> intentionally generic for now; they can be tightened per endpoint from the DTOs
> over time.
