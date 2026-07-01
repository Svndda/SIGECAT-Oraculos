# Pruebas unitarias (PHPUnit)

Documento de resultados de la suite de pruebas unitarias del backend de SIGECAT.

## Objetivo

Validar, de forma aislada y sin base de datos, las reglas de negocio que viven en
los DTO y validadores del API: validación de entrada, mapeo de filas de Oracle a
respuestas, y las restricciones de cada entidad (áreas, departamentos, secciones,
unidades, plazas, usuarios, contraseñas).

## Entorno de ejecución

| Elemento | Valor |
|----------|-------|
| Framework | PHPUnit 11.5.55 |
| Runtime | PHP 8.4.22 (CLI) |
| Configuración | `api/phpunit.xml` (suite `unit`, `tests/Unit/`) |
| Base de datos | No requerida (pruebas puras, aptas para CI) |
| Comando | `php vendor/bin/phpunit` (desde `api/`) |

La suite está aislada a propósito: `phpunit.xml` solo incluye `tests/Unit/`, que
no toca Oracle, por lo que corre en cualquier entorno (incluido CI) de forma
determinística.

## Resultado

```
PHPUnit 11.5.55 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.4.22
Configuration: /…/api/phpunit.xml

..........................................                        42 / 42 (100%)

Time: 00:00.029, Memory: 8.00 MB

OK (42 tests, 47 assertions)
```

| Métrica | Valor |
|---------|-------|
| Archivos de prueba | 10 |
| Casos de prueba | 42 |
| Aserciones | 47 |
| Exitosos | 42 (100 %) |
| Fallidos / con error | 0 |
| Tiempo | 0.029 s |
| Memoria | 8.00 MB |

> `phpunit.xml` usa `failOnWarning="true"` y `failOnRisky="true"`, de modo que
> cualquier advertencia o prueba "riesgosa" también haría fallar la suite.

## Detalle de casos (testdox)

**Area Request DTO** — `AreaRequestDTOTest`
- ✔ Rechaza área inválida: `name over 110 chars`
- ✔ Rechaza área inválida: `missing name`
- ✔ Rechaza área inválida: `description over 255`
- ✔ Acepta área válida

**Area Response DTO** — `AreaResponseDTOTest`
- ✔ Mapea fila Oracle en mayúsculas y expone `area_id`
- ✔ Mapea claves en minúsculas y preserva nulos

**Create Department DTO** — `CreateDepartmentDTOTest`
- ✔ Rechaza departamento inválido: `missing area_id`
- ✔ Rechaza departamento inválido: `missing name`
- ✔ Rechaza departamento inválido: `name over 110 chars`
- ✔ Acepta departamento válido

**Create Job Position DTO** — `CreateJobPositionDTOTest`
- ✔ Rechaza plaza inválida: `no parent entity`
- ✔ Rechaza plaza inválida: `two parents`
- ✔ Rechaza plaza inválida: `missing number`
- ✔ Valida "exactamente un padre": área / departamento / sección / unidad
- ✔ El padre mapea a la columna FK correcta: área / departamento / sección / unidad

**Create Section DTO** — `CreateSectionDTOTest`
- ✔ Rechaza sección inválida: `missing area_id`
- ✔ Rechaza sección inválida: `missing name`
- ✔ Rechaza sección inválida: `name over 110 chars`
- ✔ Acepta sección válida

**Create Unit DTO** — `CreateUnitDTOTest`
- ✔ Rechaza unidad inválida: `missing name`
- ✔ Rechaza unidad inválida: `no department nor section`
- ✔ Acepta unidad bajo departamento
- ✔ Acepta unidad bajo sección

**Password Validator** — `PasswordValidatorTest`
- ✔ Rechaza contraseña débil: `too short`
- ✔ Rechaza contraseña débil: `no uppercase`
- ✔ Rechaza contraseña débil: `no number`
- ✔ Rechaza contraseña débil: `no special char`
- ✔ Acepta contraseña fuerte

**Register User DTO** — `RegisterUserDTOTest`
- ✔ Rechaza email inválido
- ✔ Acepta registro válido

**Unit Response DTO** — `UnitResponseDTOTest`
- ✔ Mapea fila Oracle en mayúsculas bajo departamento
- ✔ Mapea fila en minúsculas bajo sección

**Update Job Position DTO** — `UpdateJobPositionDTOTest`
- ✔ Rechaza actualización vacía
- ✔ Rechaza dos padres
- ✔ Actualización solo de descripción no tiene padre
- ✔ Mover a unidad asigna el padre

## Cómo reproducir

```bash
cd api
php vendor/bin/phpunit            # resumen
php vendor/bin/phpunit --testdox  # lista legible de casos
```

## Conclusión

La totalidad de la suite unitaria (42 casos, 47 aserciones) pasa sin fallos,
advertencias ni pruebas riesgosas, cubriendo las validaciones de entrada y el
mapeo de respuestas de las entidades principales del sistema.
