# Pescamar — Aceptación de piloto

Este contrato separa lo que puede validarse automáticamente de lo que requiere personas, datos y operación real. **No se deben crear datos simulados, seeds productivos ni hechos ficticios para completar un gate.**

## 1. Gates automáticos de release

Cada PR hacia `main` debe completar el workflow **Quality**:

- `npm ci` con lockfile;
- ESLint sin errores;
- TypeScript de frontend y Vercel Functions;
- build Vite de producción;
- release smoke;
- seguridad de formularios;
- identidad estable de operador;
- contratos de Auditoría;
- Chromium desktop y mobile.

Vercel Preview debe quedar `READY` antes del merge. Después del merge, Producción debe quedar `READY` en el SHA esperado y sin nuevos errores runtime atribuibles al release.

## 2. Esquema y fuente de verdad

`db/migrations/` es la fuente canónica del esquema. Antes de aceptar un piloto se debe confirmar que el entorno Neon objetivo contiene **todos los archivos versionados actualmente presentes en ese directorio, ejecutados en orden ascendente**. No usar una lista histórica parcial como sustituto.

`db/README.md` mantiene el inventario actual y CI comprueba que toda migración del directorio esté documentada. Las compatibilidades idempotentes de runtime no reemplazan la confirmación del esquema versionado.

## 3. Identidades reales requeridas

Crear las cuentas reales —o equivalentes aprobadas por Pescamar— necesarias para cubrir estas perspectivas:

| Perfil | Rol de sistema | Alcance esperado |
| --- | --- | --- |
| Administrador | `admin` | seis plantas, operadores, configuración, auditoría y rollback global |
| Operaciones | `operations` | sólo plantas asignadas; recepción, importación y operación |
| Calidad | `quality` | sólo plantas asignadas; control y decisiones de calidad |
| Finanzas | `finance` | sólo plantas asignadas; anticipos, liquidaciones y decisiones financieras |
| Lectura / Gerencia | `viewer` | consulta autorizada sin acciones de escritura |

La asignación exacta de personas y plantas debe provenir de Pescamar. No inferir nombres, permisos ni alcance.

## 4. Matriz de aceptación autenticada

### Administración

- iniciar y cerrar sesión correctamente;
- ver las seis plantas;
- crear/restablecer un operador con credenciales válidas;
- asignar y cambiar alcance de plantas;
- consultar auditoría de autenticación y operación;
- comprobar que acciones globales/reversibles de administración no aparecen para otros roles.

### Operaciones

- ver únicamente plantas asignadas;
- crear una recepción únicamente en una planta autorizada;
- adjuntar evidencia real;
- comprobar que la recepción aparece con planta, evidencia e identidad del actor;
- publicar importaciones sólo dentro del alcance autorizado;
- confirmar que no puede ejecutar acciones financieras o administrativas reservadas.

### Calidad

- ver únicamente plantas asignadas;
- consultar y decidir recepciones dentro del alcance;
- registrar control de calidad sobre un lote real;
- confirmar que no puede administrar operadores ni ejecutar acciones financieras reservadas.

### Finanzas

- ver únicamente operación financiera de plantas autorizadas;
- crear una liquidación desde una recepción válida de su alcance;
- aprobar/rechazar anticipos y liquidaciones con comentario obligatorio;
- confirmar recuperación idempotente de anticipo cuando corresponda;
- confirmar que no puede decidir recepción/calidad fuera de su rol.

### Lectura / Gerencia

- consultar dashboard, plantas, producción, fuente canónica y recepciones autorizadas;
- no ver acciones de creación/edición reservadas;
- intentar una ruta restringida y comprobar redirección/denegación;
- verificar que las APIs protegidas rechazan escrituras aunque se evite la UI.

## 5. Gate UAT técnico por planta

El endpoint y la interfaz de rollout calculan evidencia viva por planta. Para quedar **Lista para UAT humano** deben completarse los siguientes diez gates técnicos:

1. Operaciones con credenciales reales.
2. Calidad con credenciales reales.
3. Al menos una recepción real.
4. Evidencia documental asociada a recepción.
5. Control de Calidad real.
6. Producción trazada.
7. Inventario ubicado físicamente.
8. Señal comercial vigente: orden no cancelada, despacho confirmado o venta confirmada.
9. **Flujo E2E en un mismo lote:** al menos un `reception_id` debe conectar evidencia → Calidad → Producción → inventario → comercial vigente. No basta sumar eventos de lotes distintos.
10. Al menos un cierre diario de la planta.

El gate UAT es read-only: observa hechos existentes, no crea datos para completar la matriz.

## 6. Revisión LIVE humana

UAT técnico completo **no** declara una planta LIVE. Para habilitar una revisión LIVE humana se requiere además:

- al menos **3 días consecutivos** con cierre operacional registrado;
- confirmación humana de que esos días se operaron sin soporte técnico manual cuando ese criterio aplique a la ola de rollout;
- cero P0/P1 abiertos que comprometan la operación;
- revisión de los resultados por el responsable operacional;
- aceptación humana explícita.

Los tres días de cierres son evidencia de continuidad, no prueba automática de independencia del equipo técnico. El sistema nunca debe inferir `LIVE` por sí solo.

## 7. Flujo operacional real de punta a punta

Con datos reales autorizados para la prueba, seleccionar al menos una recepción y mantener el mismo `reception_id` a través de la cadena:

1. Operaciones registra recepción con planta, proveedor, pesos y evidencia.
2. Calidad registra/valida el control correspondiente.
3. Producción registra la transformación/rendimiento del mismo lote.
4. El lote queda ubicado mediante un movimiento real de inventario.
5. El mismo lote participa en actividad comercial vigente: asignación a orden no cancelada, despacho confirmado o venta confirmada.
6. Se registra el cierre diario de la planta.
7. Se revisan Ficha 360/Timeline y Auditoría para confirmar continuidad e identidad de actores.

Cuando el piloto incluya flujo financiero, validar además liquidación, aprobación y recuperación de anticipos según corresponda. La evidencia financiera complementa el UAT operacional; no sustituye la cadena física/comercial del lote.

## 8. Seguridad

Con cuentas de QA autorizadas:

- validar rate limiting de login sin usar credenciales personales ni cuentas productivas activas;
- comprobar cookie de sesión y controles server-side vigentes;
- verificar acceso positivo y negativo por rol/planta;
- comprobar que auditoría no exponga secretos ni identificadores sensibles en texto claro;
- confirmar que `AUTH_BYPASS` permanece deshabilitado en producción normal.

## 9. Gate de salida

Un cambio técnico puntual puede obtener **PASS** cuando sus gates de CI, preview, producción y runtime están verificados.

El **piloto Pescamar** puede declararse **PASS** únicamente cuando:

- Quality y Vercel están verdes en el commit de producción;
- el esquema Neon objetivo está reconciliado con todos los archivos de `db/migrations/`;
- las perspectivas de rol relevantes completan su matriz sin fallas críticas;
- existe al menos un flujo real enlazado por lote que complete los diez gates UAT;
- la continuidad LIVE requerida ha sido observada y aceptada humanamente;
- no existen P0/P1 abiertos atribuibles al piloto;
- no existen errores runtime nuevos atribuibles al release.

Hasta entonces el estado correcto es **HOLD — ingeniería desplegada, aceptación real pendiente**.