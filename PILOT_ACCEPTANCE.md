# Pescamar — Aceptación de piloto

Este documento separa los controles que ya pueden validarse automáticamente de las pruebas que requieren identidades humanas y operación real. No se deben crear datos simulados para completar esta lista.

## Gates automáticos ya exigidos

Cada PR hacia `main` debe completar el workflow **Quality**:

- `npm ci` con lockfile;
- ESLint sin errores;
- TypeScript de frontend;
- TypeScript de Vercel Functions;
- build Vite de producción.

Vercel Preview debe quedar `READY` antes del merge. Después del merge, Producción debe quedar `READY` y sin clusters de errores runtime nuevos.

## Datos y migraciones

Antes de aceptar el piloto en producción, ejecutar o confirmar explícitamente las migraciones canónicas en Neon en este orden:

1. `001_core.sql`
2. `002_settlement_workflow.sql`
3. `003_operator_auth.sql`
4. `004_reception_plant_evidence.sql`
5. `005_auth_abuse_audit.sql`

Las compatibilidades idempotentes de runtime permiten que estructuras aditivas existan antes de la ventana de mantenimiento, pero no reemplazan la confirmación del esquema versionado completo.

## Identidades reales requeridas

Crear al menos cinco cuentas reales o las equivalentes que use Pescamar durante el piloto:

| Perfil | Rol de sistema | Alcance esperado |
| --- | --- | --- |
| Administrador | `admin` | Seis plantas, operadores, configuración, auditoría y rollback global |
| Operaciones | `operations` | Sólo plantas asignadas; recepciones, importaciones y decisiones operacionales |
| Calidad | `quality` | Sólo plantas asignadas; recepciones y decisiones de recepción |
| Finanzas | `finance` | Sólo plantas asignadas; anticipos, liquidaciones y decisiones financieras |
| Lectura / Gerencia | `viewer` | Consulta de operación autorizada sin acciones de escritura |

La asignación exacta de personas y plantas debe provenir de Pescamar, no inferirse ni inventarse.

## Matriz de aceptación autenticada

### Administración

- iniciar y cerrar sesión correctamente;
- ver las seis plantas;
- crear/restablecer un operador con contraseña de 12 a 256 caracteres;
- asignar y cambiar alcance de plantas;
- consultar la auditoría de autenticación;
- comprobar que una reversión global de importación sólo está disponible para Administración.

### Operaciones

- ver únicamente plantas asignadas;
- crear una recepción únicamente en una planta autorizada;
- adjuntar al menos una evidencia HTTPS real;
- comprobar que la recepción aparece con planta y evidencia;
- publicar una importación sólo para plantas autorizadas;
- confirmar que no puede abrir Créditos, Liquidaciones, Operadores ni Configuración.

### Calidad

- ver únicamente plantas asignadas;
- consultar y decidir recepciones dentro del alcance;
- confirmar que no ve anticipos ni liquidaciones pendientes;
- confirmar que no puede publicar importaciones ni administrar operadores.

### Finanzas

- ver únicamente recepciones/liquidaciones de plantas asignadas;
- crear una liquidación desde una recepción aprobada de su alcance;
- aprobar/rechazar anticipos y liquidaciones con comentario obligatorio;
- confirmar recuperación idempotente del anticipo al aprobar una liquidación;
- confirmar que no puede decidir recepciones fuera de su rol/alcance.

### Lectura

- consultar dashboard, plantas, producción, fuente canónica y recepciones autorizadas;
- no ver botón **Nueva recepción**;
- no ver Decisiones, Créditos, Liquidaciones, Importaciones, Operadores ni Configuración;
- intentar una URL restringida y comprobar redirección a Inicio;
- verificar que las APIs protegidas continúan rechazando operaciones aunque se evite la UI.

## Seguridad

Con una cuenta de prueba autorizada para QA:

- realizar cuatro credenciales incorrectas y comprobar que todavía no existe bloqueo;
- realizar el quinto intento fallido para la misma combinación IP/correo y comprobar HTTP `429`/`Retry-After` en el siguiente intento;
- comprobar el evento en Auditoría sin exponer IP ni correo en texto claro;
- esperar o limpiar el bloqueo siguiendo el procedimiento de QA antes de validar login correcto;
- confirmar cookie de sesión `HttpOnly`, `Secure` y `SameSite=Strict` en producción.

No ejecutar este escenario sobre credenciales personales o cuentas operativas del piloto.

## Flujo operacional mínimo de punta a punta

Con datos reales autorizados para la prueba:

1. Operaciones registra una recepción con planta, guía, pesos y evidencia.
2. Calidad u Operaciones autorizados aprueban la recepción con comentario.
3. Finanzas crea la liquidación con precio por kg y descuentos documentados.
4. Finanzas o Administración aprueba la liquidación.
5. Si existe anticipo aprobado, comprobar recuperación y pago neto.
6. Revisar historial, snapshot y acciones de aprobación para verificar identidad y trazabilidad.

## Gate de salida

El piloto puede declararse **PASS** cuando:

- Quality y Vercel están verdes en el commit de producción;
- Neon tiene las migraciones canónicas confirmadas;
- las cinco perspectivas anteriores completan su matriz sin P1/P2 abiertos;
- el flujo operacional real de punta a punta completa sin datos mock;
- no existen errores runtime nuevos atribuibles al release.

Hasta entonces el estado correcto es **HOLD — ingeniería desplegada, aceptación autenticada pendiente**.
