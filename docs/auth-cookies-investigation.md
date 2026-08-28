# Why cookies showed up in DevTools despite Bearer-only auth

Auth was migrated from cookie-based sessions to Bearer tokens in
`146d6b2` (drop cookie-based sessions) and `7644086` (Bearer tokens in
`sessionStorage`). After that migration, cookies were still occasionally
visible in the browser's DevTools during the sprint review.

## Findings

- **Frontend** never writes cookies: no `document.cookie`, no cookie
  library, and `apiClient.ts` does not set `withCredentials: true` on
  the Axios instance. The access/refresh tokens live only in
  `sessionStorage` (`services/tokenStorage.ts`).
- **Backend** never sets cookies: no `session_start()`, `setcookie()`,
  or `$_SESSION` usage anywhere under `api/src` or `api/config`.
  Verified live: neither `POST /auth/login` nor the Vite dev server
  response includes a `Set-Cookie` header.
- `api/config/cors.php` did send
  `Access-Control-Allow-Credentials: true`, which is misleading in a
  Bearer-only setup (it only matters when a request actually carries
  cookies via `withCredentials`/`credentials: 'include'`, which this
  app never does). Removed in this PR.

## Conclusion

The cookies seen in DevTools were not coming from this app's current
code. They were most likely leftover browser cookies from **before**
the Bearer migration (the app used to set a session cookie on
`localhost`), still attached to the `localhost` origin in the browser
profile used for testing. Clearing site data / cookies for `localhost`
in the browser removes them; the API and frontend do not re-create
them.
