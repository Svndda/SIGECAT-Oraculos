# Pruebas — Backend SIGECAT

Las pruebas se dividen en dos suites según lo que necesitan para correr:

- **Unitarias (PHPUnit)** — `tests/Unit/`. Ejercen la lógica de dominio (DTOs:
  validación y mapeo de filas de Oracle) sin servidor ni base de datos. Corren
  en cualquier entorno, incluido CI.
- **Integración (HTTP)** — `tests/tc*.php`. Scripts autónomos que pegan contra
  la API levantada y la base de datos real; imprimen PASS/FAIL en colores.

## Suite unitaria (PHPUnit)

```bash
cd api
composer install
vendor/bin/phpunit
```

Cubre la lógica de las entidades organizativas (área, departamento, sección,
unidad, plaza) y de usuarios/contraseñas a nivel de DTO. Incluye regresiones de
bugs corregidos:

- `AreaResponseDTOTest` fija el contrato `area_id` (bug "El recurso 'Área' no
  pudo ser localizado").
- `CreateJobPositionDTOTest` cubre la regla "una plaza pertenece a exactamente
  una entidad" y el mapeo de la columna FK (errores `ORA-02290` / `ORA-01722`).
- `UnitResponseDTOTest` verifica la normalización de claves Oracle del listado
  de unidades.

## Suite de integración (HTTP)

| Archivo                    | Cubre                              |
|----------------------------|------------------------------------|
| `tc01_login_valid.php`     | Login con credenciales válidas     |
| `tc02_login_invalid.php`   | Login con credenciales inválidas   |
| `tc03_logout.php`          | Cierre de sesión                   |
| `tc04_create_user.php`     | Registro de usuario (admin)        |
| `tc07_sql_injection.php`   | Entrada maliciosa neutralizada     |
| `tc08_invalid_json.php`    | Manejo de JSON malformado          |

### Precondiciones

1. Wallet de Oracle accesible. Si corrés desde `client/` con `npm run api`, ya
   está. Si no, exportá:
   ```bash
   export TNS_ADMIN="$PWD/../instantclient-basic-linux.x64-21.12.0.0.0dbru.el9/instantclient_21_12/network/admin"
   ```
   El `bootstrap.php` intenta setearlo automáticamente si no está.

2. La API tiene que estar arriba en `localhost:8000`:
   ```bash
   cd client && npm run api
   ```

3. Credenciales del admin semilla (TC-01, TC-03, TC-04, TC-08). No se guardan en
   git: se resuelven por variable de entorno o, en su defecto, por las constantes
   del archivo gitignored `config/oci_config.php`.
   ```bash
   # opción A — variables de entorno
   export SIGECAT_TEST_ADMIN_EMAIL="juan.perez@ucr.ac.cr"
   export SIGECAT_TEST_ADMIN_PASSWORD="<contraseña-del-seed>"
   ```
   ```php
   // opción B — en config/oci_config.php (gitignored)
   const TEST_ADMIN_EMAIL = 'juan.perez@ucr.ac.cr';
   const TEST_ADMIN_PASSWORD = '<contraseña-del-seed>';
   ```

### Cómo correr

```bash
cd api
php tests/run_all.php          # todos
php tests/tc01_login_valid.php # uno solo
```

Códigos de salida: `0` pasó · `1` falló · `2` saltado (servidor no disponible).
