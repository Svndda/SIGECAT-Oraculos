# Running SIGECAT with Docker

This stack removes the manual Oracle Instant Client + `pdo_oci` setup: the API
image builds the extension from PECL against the Instant Client. Credentials are
never baked into the images — the database wallet and `oci_config.php` are
mounted from the host at runtime.

## Prerequisites

- Docker with the Compose plugin.
- The Oracle **wallet** directory (`cwallet.sso`, `sqlnet.ora`, `tnsnames.ora`, …).
- `api/config/oci_config.php` with the DB user, password and TNS name.

## Configure

The compose file defaults to the wallet and config paths already used in this
repo. To point elsewhere, create a `.env` next to `docker-compose.yml`:

```env
WALLET_DIR=/absolute/path/to/wallet
OCI_CONFIG=/absolute/path/to/oci_config.php
```

Important: inside the wallet, `sqlnet.ora`'s `WALLET_LOCATION` must point to the
in-container path, otherwise the TLS handshake to Oracle fails:

```
WALLET_LOCATION = (SOURCE = (METHOD = FILE) (METHOD_DATA = (DIRECTORY = "/opt/oracle/wallet")))
```

## Run

```bash
docker compose up --build
```

- Web client: http://localhost:5173
- API:        http://localhost:8000

The client is served by nginx and talks to the API at `localhost:8000`, which
CORS already allows. Stop with `docker compose down`.

## Notes

- The web image is a production build (`npm run build`) served by nginx; for
  live reload use `npm run dev` on the host instead.
- The API image runs PHP's built-in server, matching `npm run api`. It is meant
  for local/development use, not as a hardened production server.
