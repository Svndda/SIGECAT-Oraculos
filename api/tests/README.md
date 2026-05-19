# Pruebas — Backend SIGECAT

Tests para los casos del documento de especificación. Cada `tcXX_*.php` es un script PHP autónomo que imprime PASS/FAIL en colores.

## Mapeo TC → archivo

| TC    | Archivo                           | Tipo            | Requiere server |
|-------|-----------------------------------|-----------------|-----------------|
| TC-01 | `tc01_login_valid.php`            | HTTP end-to-end | Sí              |
| TC-02 | `tc02_login_invalid.php`          | HTTP end-to-end | Sí              |
| TC-03 | `tc03_logout.php`                 | HTTP end-to-end | Sí              |
| TC-04 | `tc04_create_user.php`            | HTTP end-to-end | Sí              |
| TC-05 | `tc05_dto_invalid_email.php`     | Unitario (DTO)  | No              |
| TC-06 | `tc06_dto_weak_password.php`     | Unitario (DTO)  | No              |
| TC-07 | `tc07_sql_injection.php`          | Unitario (DB)   | No (sí DB)      |
| TC-08 | `tc08_invalid_json.php`           | HTTP end-to-end | Sí              |

## Precondiciones

1. Wallet de Oracle accesible. Si corrés desde `client/` con `npm run api`, ya está. Si lanzás los tests desde otro contexto, exportá:
   ```bash
   export TNS_ADMIN="$PWD/../instantclient-basic-linux.x64-21.12.0.0.0dbru.el9/instantclient_21_12/network/admin"
   ```
   El `bootstrap.php` intenta setearlo automáticamente si no está.

2. Para los tests de HTTP (TC-01..04, TC-08) el API tiene que estar arriba en `localhost:8000`:
   ```bash
   cd client && npm run api
   ```

3. Usuario de pruebas existente (TC-01..03):
   - email: `juan.perez@ucr.ac.cr`
   - password: `Demo1234!`

## Cómo correr

### Todos
```bash
cd api
php tests/run_all.php
```

### Uno solo
```bash
cd api
php tests/tc05_dto_invalid_email.php
```

## Códigos de salida

- `0` — pasó
- `1` — falló (algún assert)
- `2` — saltado (servidor no disponible)
