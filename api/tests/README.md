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
| TC-09 | `tc09_area_dto_validation.php`           | Unitario (DTO) | No |
| TC-10 | `tc10_area_response_dto.php`             | Unitario (DTO) | No |
| TC-11 | `tc11_department_dto_validation.php`     | Unitario (DTO) | No |
| TC-12 | `tc12_section_dto_validation.php`        | Unitario (DTO) | No |
| TC-13 | `tc13_unit_dto_validation.php`           | Unitario (DTO) | No |
| TC-14 | `tc14_job_position_dto_validation.php`   | Unitario (DTO) | No |
| TC-15 | `tc15_job_position_parent_mapping.php`   | Unitario (DTO) | No |
| TC-16 | `tc16_job_position_update_dto.php`       | Unitario (DTO) | No |
| TC-17 | `tc17_unit_response_dto.php`             | Unitario (DTO) | No |

## Pruebas de entidades (TC-09..17)

Cubren la lógica de negocio de las entidades organizativas (área, departamento,
sección, unidad, plaza) a nivel de DTO — validación y mapeo de respuesta — sin
necesidad de servidor ni base de datos. Incluyen regresiones de los bugs
corregidos recientemente:

- **TC-10** fija el contrato `area_id` del `AreaResponseDTO` (bug "Error al
  eliminar / El recurso 'Área' no pudo ser localizado").
- **TC-14/TC-15** cubren la regla "una plaza pertenece a exactamente una
  entidad", detrás de los errores `ORA-02290` / `ORA-01722` de creación de plazas.
- **TC-17** verifica la normalización de claves Oracle en el listado de unidades
  (bug del select de entidad que no se podía elegir).

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
