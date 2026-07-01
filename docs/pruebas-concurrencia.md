# Pruebas de concurrencia

Documento de resultados de las pruebas de concurrencia sobre el control de acceso
del API de SIGECAT: el **limitador de solicitudes** (rate limiting) del login y el
**bloqueo por intentos fallidos**, ambos sensibles a condiciones de carrera.

## Objetivo

Verificar que, cuando muchas solicitudes de inicio de sesión llegan **al mismo
tiempo** desde la misma IP, el sistema:

1. Cuenta **cada** solicitud exactamente una vez (sin "lost updates") pese a la
   contención sobre la misma fila del contador.
2. Rechaza con **HTTP 429** las solicitudes que exceden el límite configurado.
3. Bloquea la cuenta tras el umbral de intentos fallidos, sin sobrepasarlo por
   incrementos concurrentes.
4. No produce errores de servidor (HTTP 500) ni interbloqueos bajo carga.

## Mecanismos bajo prueba

| Mecanismo | Configuración | Estrategia de concurrencia |
|-----------|---------------|----------------------------|
| Rate limit de login (`AuthController`) | 10 solicitudes / 300 s por IP | `RateLimitRepository::hit()` usa `SELECT … FOR UPDATE` para bloquear la fila del bucket y contar sin perder actualizaciones; maneja además la carrera de inserción del bucket. |
| Bloqueo por intentos fallidos (`AuthService`) | 5 intentos, ventana de 900 s | `UserRepository::incrementFailedAttempts()` usa `UPDATE … SET failed = failed + 1` (incremento atómico en la base de datos). |

## Entorno de ejecución

| Elemento | Valor |
|----------|-------|
| API | PHP 8.4 + Oracle, contenedor `api` (puerto 8000) |
| Cliente de carga | `curl` en paralelo con `xargs -P N` |
| Base de datos | Oracle (misma conexión del API) |
| Usuario objetivo | `demo.marco@ucr.ac.cr` (cuenta de datos demo) |
| Solicitudes concurrentes | N = 30 |

Antes de cada corrida se limpia el bucket de `RATE_LIMITS` y se pone en cero el
contador de intentos fallidos del usuario, para partir de un estado conocido.

## Procedimiento

Se lanzan 30 solicitudes `POST /auth/login` **simultáneas** con contraseña
incorrecta para el mismo usuario y la misma IP, y luego se leen los contadores
que quedaron escritos bajo contención. El límite de login es 10/300 s, por lo que
se espera: hasta 10 solicitudes "admitidas" (que llegan a autenticación) y el
resto rechazadas con 429; el contador de `RATE_LIMITS` debe quedar exactamente en
30 si el bloqueo de fila evita actualizaciones perdidas.

```bash
# desde la raíz del repositorio, con la pila docker levantada
bash api/tests/concurrency/run_login_concurrency.sh
```

El arnés (`run_login_concurrency.sh` + `rate_limit_helper.php`) es reproducible y
se versiona junto a este documento.

## Resultados

Tres corridas consecutivas de N = 30, resultados **idénticos y estables**:

```
== Login rate-limiter concurrency test ==
API_URL=http://localhost:8000  EMAIL=demo.marco@ucr.ac.cr  concurrent_requests=30  limit=10/300s

HTTP status tally (of 30 responses):
  200 (ok)            : 0
  401 (bad creds)     : 5
  403 (locked)        : 5
  429 (rate limited)  : 20
  500 (server error)  : 0

Counters after the burst:
rate_limits_max_hits=30
user_failed_attempts=5

PASS: counter is exact (30/30), 10<=10 passed, 20 rejected with 429, 0 errors.
```

| Métrica | Resultado | Esperado | Veredicto |
|---------|-----------|----------|-----------|
| Solicitudes totales | 30 | 30 | ✔ |
| Contador `RATE_LIMITS.hits` | 30 | 30 (sin pérdidas) | ✔ |
| Solicitudes admitidas (200/401/403) | 10 | ≤ 10 | ✔ |
| Rechazadas con 429 | 20 | 30 − 10 = 20 | ✔ |
| Intentos fallidos del usuario | 5 | 5 (tope, sin exceso) | ✔ |
| Errores 500 | 0 | 0 | ✔ |

### Interpretación

- **Conteo exacto (30/30):** las 30 solicitudes concurrentes incrementaron el
  contador sin perder ninguna. Esto confirma que el `SELECT … FOR UPDATE`
  serializa correctamente el acceso a la fila del bucket; sin ese bloqueo, la
  lectura-modificación-escritura concurrente habría dejado el contador por debajo
  de 30 (lost updates) y habría dejado pasar más solicitudes de las permitidas.
- **10 admitidas / 20 con 429:** el límite de 10/300 s se respeta con exactitud
  aun bajo ráfaga simultánea.
- **Desglose de las 10 admitidas (5×401 + 5×403):** las primeras 5 devuelven
  401 (credenciales inválidas) y, al alcanzarse el umbral de 5 intentos, las
  siguientes 5 devuelven 403 (cuenta bloqueada). El contador de intentos fallidos
  queda en 5 exactamente: el incremento atómico no se pasa del umbral pese a la
  concurrencia.
- **0 errores 500:** ninguna condición de carrera derivó en excepción no
  controlada ni en interbloqueo.

## Cómo reproducir

```bash
# variables opcionales: API_URL, EMAIL, N
N=30 bash api/tests/concurrency/run_login_concurrency.sh
```

> Tras la prueba, la cuenta objetivo queda bloqueada por intentos fallidos. Para
> restablecerla:
> ```bash
> docker compose exec -T api php /app/api/tests/concurrency/rate_limit_helper.php reset demo.marco@ucr.ac.cr
> ```

## Conclusión

El control de acceso del login es **correcto bajo concurrencia**: el limitador de
solicitudes cuenta sin pérdidas gracias al bloqueo de fila, aplica el límite con
exactitud (429), el bloqueo por intentos fallidos respeta su umbral con
incrementos atómicos, y no se observan errores de servidor ni interbloqueos.
