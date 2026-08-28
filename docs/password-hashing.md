# Spike / ADR: Cifrado (hashing) de contraseñas

> Registro de decisión del equipo. Documenta **qué** método usamos para proteger
> las contraseñas, **por qué** lo elegimos y aclara cómo se almacena el
> resultado. Responde a la observación de la revisión: _"No se establece cuál
> método de encriptación utilizaron, ni por qué decidieron ese método. No hay un
> Spike o algo que indique la decisión. La tabla almacena el método de
> encriptación y los argumentos utilizados en vez del valor."_

## 1. Decisión

Las contraseñas **no se cifran, se _hashean_** con **Argon2id**, a través de la
función nativa de PHP `password_hash()` con el algoritmo `PASSWORD_ARGON2ID`
(parámetros por defecto de PHP: memory_cost, time_cost y threads). La
verificación se hace con `password_verify()`.

> Nota histórica: el proyecto arrancó con **bcrypt** (`PASSWORD_BCRYPT`) por
> simplicidad/portabilidad — ver §2 — y migró a Argon2id una vez confirmada la
> disponibilidad de la extensión en todos los entornos (local y Docker/PHP
> 8.4). La migración de los hashes ya emitidos es transparente: ver §6.

Aclaración importante de terminología: cifrar (encriptar) es reversible; un hash
**no** lo es. Para credenciales lo correcto es hashear con un algoritmo lento y
con sal, no encriptar. Por eso nunca guardamos ni la contraseña en claro ni una
versión "desencriptable".

## 2. Por qué Argon2id (y por qué se empezó con bcrypt)

- **Es un hash adaptativo y con sal**, diseñado específicamente para contraseñas.
  Cada contraseña recibe una **sal aleatoria distinta** (generada
  automáticamente por `password_hash`), por lo que dos usuarios con la misma
  contraseña producen hashes diferentes y las _rainbow tables_ no aplican.
- **Ganador del Password Hashing Competition** y recomendado por OWASP como
  primera opción (por delante de bcrypt) por su resistencia superior a ataques
  con hardware dedicado (GPU/ASIC), gracias a su costo de memoria configurable.
- **Es nativo de PHP** (`password_hash` / `password_verify`): menos superficie de
  error que una implementación propia, y soporta migración de algoritmo con
  `password_needs_rehash()`.
- Se empezó con **bcrypt** porque no dependía de verificar soporte de la
  extensión Argon2 en cada entorno; una vez confirmado que PHP 8.4 (local y la
  imagen Docker) lo soporta nativamente, se migró sin fricción.

Alternativas consideradas:

| Opción | Por qué no |
|---|---|
| Texto plano / MD5 / SHA-1 / SHA-256 "a secas" | Inseguros para contraseñas: rápidos y sin sal. Descartados. |
| bcrypt (`PASSWORD_BCRYPT`) | Algoritmo inicial del proyecto (ver nota histórica arriba); reemplazado por Argon2id por su mejor resistencia a ataques con GPU/ASIC. Los hashes bcrypt existentes se migran solos en el próximo login (§6). |

## 3. Aclaración: qué se guarda en la columna `password_hash`

La observación de que "se guarda el método y los argumentos en vez del valor" es
un malentendido sobre el **formato PHC** que produce `password_hash`. La columna
**sí guarda el valor del hash**; lo que pasa es que bcrypt lo almacena todo junto
en una sola cadena autodescriptiva:

```
$argon2id$v=19$m=65536,t=4,p=1$<sal en base64>$<digest en base64>
└───┬───┘ └─┬─┘ └───────┬──────┘ └──────┬──────┘ └──────┬──────┘
    │       │           │                │                └ digest (el "valor" del hash)
    │       │           │                └ sal (única por contraseña)
    │       │           └ memoria (m), iteraciones (t) y paralelismo (p)
    │       └ versión del algoritmo
    └ identificador del algoritmo (Argon2id)
```

Es decir, una sola cadena contiene **algoritmo + costo + sal + digest**. Esto es
**a propósito y necesario**: `password_verify()` lee esos parámetros de la misma
cadena para volver a derivar el hash de la contraseña ingresada y compararlo. No
necesitamos (ni debemos) guardar la sal o el costo en columnas aparte.

## 4. Dónde está en el código

- Registro de usuario, cambio de contraseña por admin y cambio propio:
  `api/src/Services/UserService.php` → `password_hash($password, PASSWORD_ARGON2ID)`.
- Restablecimiento vía recuperación:
  `api/src/Services/PasswordRecoveryService.php` → `password_hash(..., PASSWORD_ARGON2ID)`.
- Inicio de sesión (verificación + migración transparente de hashes viejos):
  `api/src/Services/AuthService.php` → `password_verify($password, $user['password_hash'])`,
  seguido de `password_needs_rehash(...)` (ver §6).
- Reglas mínimas de la contraseña (longitud, mayúscula, número, símbolo):
  `api/src/DTO/PasswordValidator.php`.

## 5. Nota: tokens de recuperación ≠ contraseñas

Los **tokens de recuperación de contraseña** se hashean con `SHA-256`
(`api/src/Services/PasswordRecoveryService.php` y `AuthService.php`). Esto es
correcto y **distinto** del caso de las contraseñas: un token es un valor
aleatorio largo y de un solo uso, no un secreto elegido por el usuario, así que
no necesita un hash lento; solo evitar guardarlo en claro.

## 6. Migración de bcrypt a Argon2id (ya implementada)

`password_verify()` entiende cualquier formato que produzca `password_hash`
(el algoritmo va codificado en el propio hash), así que un usuario con un hash
bcrypt viejo puede seguir logueándose sin cambios. La migración es transparente
y ocurre en `AuthService::login`:

1. Se verifica la contraseña con `password_verify()` contra el hash almacenado
   (bcrypt o Argon2id, da igual).
2. Si la verificación es exitosa, se llama a
   `password_needs_rehash($storedHash, PASSWORD_ARGON2ID)`.
3. Si devuelve `true` (el hash no es Argon2id, o usa parámetros desactualizados),
   se re-hashea la contraseña en texto plano recién verificada con
   `PASSWORD_ARGON2ID` y se actualiza `password_hash` en la fila
   (`UserRepository::updatePasswordHashById`), **sin** tocar
   `is_password_temp` ni `failed_logging_attempts` — no es un evento de cambio
   de contraseña, solo una migración de algoritmo en segundo plano.

Así, cada usuario existente queda migrado a Argon2id la primera vez que inicia
sesión después de este cambio, sin ninguna acción manual.

## 7. Trabajo futuro

- Revisar periódicamente los **parámetros de costo** de Argon2id (memoria,
  iteraciones) y subirlos conforme mejore el hardware, reutilizando la misma
  técnica de `password_needs_rehash()` del §6.
