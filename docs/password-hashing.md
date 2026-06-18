# Spike / ADR: Cifrado (hashing) de contraseñas

> Registro de decisión del equipo. Documenta **qué** método usamos para proteger
> las contraseñas, **por qué** lo elegimos y aclara cómo se almacena el
> resultado. Responde a la observación de la revisión: _"No se establece cuál
> método de encriptación utilizaron, ni por qué decidieron ese método. No hay un
> Spike o algo que indique la decisión. La tabla almacena el método de
> encriptación y los argumentos utilizados en vez del valor."_

## 1. Decisión

Las contraseñas **no se cifran, se _hashean_** con **bcrypt**, a través de la
función nativa de PHP `password_hash()` con el algoritmo `PASSWORD_BCRYPT`
(factor de costo por defecto = 10). La verificación se hace con
`password_verify()`.

Aclaración importante de terminología: cifrar (encriptar) es reversible; un hash
**no** lo es. Para credenciales lo correcto es hashear con un algoritmo lento y
con sal, no encriptar. Por eso nunca guardamos ni la contraseña en claro ni una
versión "desencriptable".

## 2. Por qué bcrypt

- **Es un hash adaptativo y con sal**, diseñado específicamente para contraseñas.
  Cada contraseña recibe una **sal aleatoria distinta** (generada
  automáticamente por `password_hash`), por lo que dos usuarios con la misma
  contraseña producen hashes diferentes y las _rainbow tables_ no aplican.
- **Es deliberadamente lento** (factor de costo configurable), lo que encarece
  los ataques de fuerza bruta. El costo se puede subir en el futuro sin cambiar
  el código.
- **Está recomendado por OWASP** para almacenamiento de contraseñas y es el
  estándar de facto en PHP.
- **Es nativo de PHP** (`password_hash` / `password_verify`): menos superficie de
  error que una implementación propia, y soporta migración de algoritmo con
  `password_needs_rehash()`.

Alternativas consideradas:

| Opción | Por qué no (por ahora) |
|---|---|
| Texto plano / MD5 / SHA-1 / SHA-256 "a secas" | Inseguros para contraseñas: rápidos y sin sal. Descartados. |
| Argon2id (`PASSWORD_ARGON2ID`) | Es **mejor** que bcrypt y es nuestra ruta de mejora futura, pero depende de que la extensión esté disponible en el entorno de despliegue. Por simplicidad y portabilidad arrancamos con bcrypt. La migración es trivial gracias a `password_needs_rehash()` (ver §6). |

## 3. Aclaración: qué se guarda en la columna `password_hash`

La observación de que "se guarda el método y los argumentos en vez del valor" es
un malentendido sobre el **formato PHC** que produce `password_hash`. La columna
**sí guarda el valor del hash**; lo que pasa es que bcrypt lo almacena todo junto
en una sola cadena autodescriptiva:

```
$2y$10$Q9mZ4u8t1f6kРnД….<los 31 caracteres del digest>
└┬┘ └┬┘ └──────┬──────┘ └──────────────┬──────────────┘
 │   │         │                        └ digest (el "valor" del hash)
 │   │         └ sal (22 caracteres, única por contraseña)
 │   └ costo (10) = 2^10 iteraciones
 └ identificador del algoritmo ($2y$ = bcrypt)
```

Es decir, una sola cadena contiene **algoritmo + costo + sal + digest**. Esto es
**a propósito y necesario**: `password_verify()` lee esos parámetros de la misma
cadena para volver a derivar el hash de la contraseña ingresada y compararlo. No
necesitamos (ni debemos) guardar la sal o el costo en columnas aparte.

## 4. Dónde está en el código

- Registro de usuario y cambio de contraseña por admin:
  `api/src/Services/UserService.php` → `password_hash($password, PASSWORD_BCRYPT)`.
- Restablecimiento vía recuperación:
  `api/src/Services/PasswordRecoveryService.php` → `password_hash(..., PASSWORD_BCRYPT)`.
- Inicio de sesión (verificación):
  `api/src/Services/AuthService.php` → `password_verify($password, $user['password_hash'])`.
- Reglas mínimas de la contraseña (longitud, mayúscula, número, símbolo):
  `api/src/DTO/PasswordValidator.php`.

## 5. Nota: tokens de recuperación ≠ contraseñas

Los **tokens de recuperación de contraseña** se hashean con `SHA-256`
(`api/src/Services/PasswordRecoveryService.php` y `AuthService.php`). Esto es
correcto y **distinto** del caso de las contraseñas: un token es un valor
aleatorio largo y de un solo uso, no un secreto elegido por el usuario, así que
no necesita un hash lento; solo evitar guardarlo en claro.

## 6. Trabajo futuro

- Migrar a **Argon2id** cuando el entorno lo soporte. Como `password_verify`
  entiende cualquier formato que produzca `password_hash`, se puede migrar de
  forma transparente: en el login, tras verificar, llamar a
  `password_needs_rehash($hash, PASSWORD_ARGON2ID)` y, si devuelve `true`,
  re-hashear con el nuevo algoritmo y actualizar la fila.
- Revisar periódicamente el **factor de costo** y subirlo conforme mejore el
  hardware (misma técnica de `password_needs_rehash`).
