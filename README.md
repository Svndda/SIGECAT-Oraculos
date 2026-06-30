# SIGECAT

Sistema de gestión de cargas de trabajo y declaraciones de jornada para la
Universidad de Costa Rica. Permite que los funcionarios declaren las funciones,
licencias y tiempos de descanso de su jornada, y que el personal administrativo
gestione la estructura organizacional (áreas, departamentos, secciones,
unidades, cargos y plazas) y los catálogos asociados.

## Arquitectura

El proyecto es un monorepo con dos componentes desplegables de forma
independiente:

- **`client/`** — SPA en React 19 + TypeScript, construida con Vite y Material
  UI. Consume la API por HTTP (Axios) y exporta declaraciones a PDF.
- **`api/`** — API REST en PHP 8.4 sobre Oracle Database, sin framework. Usa un
  enrutador propio, controladores delgados, servicios para la lógica de negocio
  y repositorios con sentencias preparadas (PDO/OCI).

La autenticación es por token (Bearer en `Authorization`, refresh token en el
cuerpo); el frontend guarda los tokens en `sessionStorage`. Los roles son
`admin` y `employee`.

## Estructura del repositorio

```
client/                 SPA (React + TypeScript + Vite)
  src/features/         Vistas por dominio (admin, employee)
  src/services/         Clientes HTTP de la API
api/                    API REST (PHP + Oracle)
  src/Controllers/      Capa HTTP
  src/Services/         Lógica de negocio
  src/Repositories/     Acceso a datos (PDO, sentencias preparadas)
  config/routes.php     Definición de rutas
  tests/                Suite de pruebas (ver api/tests/README.md)
docs/                   Manual de usuario y notas de diseño
SIGECAT-DB-*.sql        Esquema y migraciones de la base de datos
```

## Requisitos

- Node.js 20+
- PHP 8.4 con la extensión `pdo_oci`
- Oracle Instant Client 21+ y el wallet de conexión a la base de datos

La extensión `pdo_oci` se removió del núcleo de PHP en 8.4; el script
`setup-pdo-oci.sh` compila e instala la versión de PECL. El Instant Client, el
wallet y `config/oci_config.php` son locales y no se versionan (contienen
credenciales).

## Puesta en marcha

Instalar dependencias:

```bash
cd client && npm install
cd ../api && composer install
```

Levantar frontend y API a la vez (desde `client/`):

```bash
npm run dev:full
```

O por separado:

```bash
npm run dev   # SPA en http://localhost:5173
npm run api   # API en http://localhost:8000
```

## Base de datos

El esquema y sus cambios se mantienen como scripts SQL en la raíz
(`SIGECAT-DB-*.sql`). Las migraciones se aplican en orden cronológico sobre la
instancia de Oracle; cada archivo documenta su propósito en el encabezado. La
lógica de negocio en base de datos (procedimientos y triggers) está en
`SIGECAT-DB-ROUTINES-business-logic.sql` y se describe en
`docs/db-business-logic-routines.md`.

## Pruebas y calidad

```bash
# Frontend
cd client && npm run lint && npm run build

# Backend (la API debe estar corriendo para las pruebas HTTP)
cd api && php tests/run_all.php
```

El backend incluye análisis estático con PHPStan (`api/phpstan.neon`).

## Seguridad

- Contraseñas con `bcrypt`; validación de fortaleza en el registro.
- Tokens aleatorios almacenados con hash; access token de vida corta con
  rotación de refresh token.
- Rate limiting por IP en autenticación y recuperación de contraseña.
- Bloqueo de cuenta temporal tras intentos fallidos, con desbloqueo automático.
- Acceso a datos exclusivamente con sentencias preparadas.

## Documentación

- `docs/manual-usuario.md` — manual de usuario (administrador y funcionario).
- `docs/soft-delete-design.md`, `docs/password-hashing.md` — notas de diseño.
- `api/tests/README.md` — cómo ejecutar y configurar la suite de pruebas.
