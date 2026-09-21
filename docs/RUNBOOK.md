# Runbook operativo — Seafood Intelligence OS (Pescamar)

Guía de operación para el equipo técnico de apoyo (no desarrollo diario). Todo lo descrito aquí está verificado contra el repositorio; ante duda, manda `db/README.md`, `PILOT_ACCEPTANCE.md` y este documento, en ese orden de autoridad de esquema.

## 1. Arquitectura en 5 líneas

1. Front-end: SPA Vite (React 19, entradas ES/EN) servida desde Vercel; enrutamiento SPA vía `vercel.json`.
2. Back-end: ~111 funciones serverless en `api/*.ts` (TypeScript, Node) desplegadas como Vercel Functions; sesión por cookie firmada contra PostgreSQL.
3. Datos: PostgreSQL 18 en Neon (proyecto `pescamar-control`, región aws-us-east-2, rama `main`), acceso único vía `DATABASE_URL`.
4. Despliegue: cada push a `main` dispara CI (GitHub Actions, workflow `Quality`) y, en verde, Vercel despliega `main` automáticamente a Producción.
5. Modelo operativo: capturar una vez → confirmar lo físico → automatizar lo repetitivo → escalar excepciones → decidir con evidencia. Ver `README.md` y `ROADMAP.md`.

## 2. Verificación de salud

Hay tres capas independientes. Verde total = las tres verdes. Ante rojo, alertar al responsable técnico.

**(a) Monitor externo de liveness.** Corre cada hora desde fuera de Vercel (a la hora en punto ~:17, America/Santiago) y alerta ante caída; usa el header de bypass de protección de despliegue configurado a nivel proyecto Vercel (`x-vercel-protection-bypass`, valor solo en el proyecto, nunca en el repo). Complemento interno: la app expone un cron horario en Vercel (`/api/cron-operational-health`, minuto :17, autenticado con `Authorization: Bearer $CRON_SECRET`) que mide salud operacional desde dentro de la plataforma. Replica humana del probe:

```bash
curl -s https://<dominio-producción>/api/public-health
# Esperado: HTTP 200 {"ok":true,"service":"pescamar","status":"live","healthVersion":"pescamar.public-health.v1","checkedAt":"..."}
```

**(b) Vista en sitio `/admin/salud`** (solo admin, sin entrada de navegación; URL directa). Verde = panel "Build y entorno" con `Entorno: production` y `Commit` igual al SHA desplegado, y chip de liveness en **Operativa** (HTTP 200, latencia en ms, `checkedAt` fresco; se repolle cada 30 s con tu sesión).

**(c) Telemetría de pilotaje `/admin/pilotaje`** (solo admin) + gate de esquema. Verde = los cuatro paneles cargan sin banner de error (rutas 7/30 d, operadores activos 14 d, últimos eventos, feedback Seafood AI) y `/api/schema-preflight` reporta `pilotGate: pass`. Un `hold` del gate indica esquema no reconciliado (ver §3).

**(d) Gate QA EdgeVision.** Contrato CI `scripts/edgevision-qa-smoke.mjs` (step «EdgeVision QA gate»). Verde = el step pasa: pinea el esquema de intake de datasets (migración 059), la API admin-only de lotes en `/uni`, el seam de promoción inerte (responde 409 con la explicación de política) y la frontera predictiva (`predictiveBaselineAvailable: false`). Un rojo aquí significa que alguien tocó el camino predictivo sin pasar los gates de Grade A.

## 3. Aplicar migraciones

**No existe endpoint que aplique migraciones.** El flujo canónico (`db/README.md`): ejecutar los archivos de `db/migrations/` en orden ascendente por prefijo, con parada inmediata ante error:

```bash
for migration in $(find db/migrations -maxdepth 1 -name '*.sql' | sort); do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" || exit 1
done
```

En Neon, la práctica segura es crear una rama efímera desde `main`, aplicar ahí, verificar y borrarla; para producción, aplicar solo el archivo nuevo contra `main` (los archivos son idempotentes: `if not exists` / `on conflict do nothing`). Registros innegociables:

- `baseline` / `reconciled` / `applied` tienen semántica distinta; **nunca** inventar `applied_at`: `applied` exige timestamp real del momento de ejecución.
- Cada migración nueva se registra sola vía el trailer `insert into schema_migrations ...` del archivo.
- Después de aplicar: verificar `select migration_name,evidence_kind,applied_at from schema_migrations order by 1` y el `pilotGate` de `/api/schema-preflight` (debe pasar a `pass`).
- CI protege el SQL de los endpoints de solo lectura con `scripts/endpoint-sql-contracts.mjs` (rama efímera + migraciones + consultas canónicas); un SQL inválido falla CI antes de desplegar, pero **aplicar la migración en Neon sigue siendo manual**.

**Decisión 060 — Santa Rosa, 7ª planta (2026-09-21):** `060_santa_rosa_plant.sql` expande los CHECK de `plant_id` en `receptions` y `plant_identity_links` para incluir `santa-rosa` (expand-only). Decisión evidence-based: el sitio «Santa Rosa» es un lugar histórico distinto de Planta Quellón (sector Santa Rosa, zona de extracción Quellón; 87 registros históricos abr-2025–jun-2026 y 121 canónicos hasta sep-2026, la actividad más reciente de cualquier sitio) y ninguna de las 6 plantas del catálogo coincide con esa evidencia. Queda **pendiente confirmación en terreno**: el modo `Maquila` y la ubicación en `src/plants.ts` son inferidos de la evidencia histórica (clientes tipo Maruha, recepción/proceso de erizo) y deben verificarse en la primera visita. El contrato `scripts/migration-inventory-smoke.mjs` pinea que las 7 slugs sean idénticas en `src/plants.ts`, `api/_plants.ts` y los CHECK de 060.

## 4. CI/CD

Workflow `Quality` (`.github/workflows/quality.yml`), corre en cada push a `main` y en PRs hacia `main`, `feat/**` y `docs/**`:

1. `npm ci` → `npm run quality` (lint 0 warnings + typecheck + build).
2. ~40 contratos en `scripts/*.mjs` (inventario de migraciones, contratos de UI, gate QA EdgeVision, contrato SQL de endpoints contra Neon efímero).
3. Playwright desktop + mobile (Chromium) con artefactos de evidencia adjuntos al run. Incluye el gate de accesibilidad `tests/a11y-axe.spec.ts` (axe-core, reglas `wcag2a`/`wcag2aa`): escanea 8 rutas autenticadas de alto tráfico y falla sólo en violaciones `critical`/`serious`; los warnings `moderate`/`minor` se reportan en la salida sin bloquear.

**Regla same-SHA:** un cambio solo se considera desplegado cuando CI está en `success` **y** Vercel reporta `Deployment has completed` **sobre el mismo SHA**. Comprobar: API de GitHub Actions (`actions/runs?branch=main`) y Deployments del repo.

**Rollback:** `git revert <sha> && git push` — Vercel despliega `main` automáticamente. Ojo: el rollback de código no revierte datos; las migraciones aplicadas en Neon no tienen rollback automático.

**Política de flakes:** hay specs conocidos como flaky ocasional (p. ej. rollforward, browser-smoke, supplier-reception-decision); CI reintenta una vez (`retries: 1`) y un flake que pasa en retry es aceptable. Si un test falla dos veces seguidas, tratarlo como fallo real e investigar **antes** de volver a pushear. Nunca dejar `main` rojo a propósito; un push rojo se corrige de inmediato o se revierte.

**Logs:** GitHub Actions → run → job `quality` (steps y artefactos `browser-release-evidence`). Logs de runtime de funciones: dashboard Vercel → proyecto → Logs.

## 5. Secretos y variables de entorno

Nombres exactos referenciados en el código/config. **Nunca** pegar valores en docs, tickets ni chats.

| Nombre | Dónde | Propósito | Rotación |
|---|---|---|---|
| `DATABASE_URL` | Vercel (producción) | Conexión única a Neon | Desde Neon (reset password de rol); actualizar en Vercel |
| `ADMIN_SETUP_TOKEN` | Vercel | Activación del primer admin (`/api/bootstrap`); exige ≥24 chars | Rotar tras la activación inicial; luego altas solo con identidad admin individual |
| `CRON_SECRET` | Vercel | Bearer del cron interno `/api/cron-operational-health` (minuto 17) | Anual o ante sospecha |
| `OPENAI_API_KEY` | Vercel | Seafood AI (respuestas) | Según política del proveedor |
| `OPENAI_VISION_MODEL` | Vercel | Modelo de visión usado por reception/Uni Vision provenance | Con el modelo |
| `CEO_OPERATOR_EMAIL` | Vercel | Correo que identifica al operador CEO (experiencia ejecutiva); tiene default en código | Si cambia el CEO |
| `PLANT_EXECUTION_WRITES_ENABLED` | Vercel | Kill-switch de escrituras Plant Execution (default activo solo en producción) | No aplica |
| `COLD_SENSOR_INGEST_SECRET` | Vercel | Ingesta machine-to-machine de sensores de frío (fail-closed) | Anual o ante exposición |
| `WHATSAPP_WEBHOOK_SECRET` | Vercel | Verificación del webhook de WhatsApp | Anual o ante exposición |
| `VERCEL_GIT_COMMIT_SHA` | Vercel (automática) | SHA expuesto en `/api/status` (panel de despliegue) | Automática |
| `NEON_API_KEY` | GitHub (secret, **pendiente**) | Contrato SQL de endpoints: crear/borrar ramas efímeras | Al configurar y anual |
| `NEON_PROJECT_ID` | GitHub (variable, **pendiente**) | `icy-union-17389410` | Estable |

Notas: no existen `AI_GATEWAY_API_KEY` ni `AUTH_BYPASS` en el código — cualquier referencia a ellos es inventada. La protección de despliegue de Vercel (bypass header) se configura a nivel proyecto, fuera del repo.

## 6. Base de datos (Neon)

- Proyecto `pescamar-control` (id `icy-union-17389410`, aws-us-east-2, PostgreSQL 18), plan **free** al momento de escribir. La rama `main` (`br-sweet-surf-axpwi30f`) **no está protegida** (admite push/reset directo).
- Plan free: **sin backups programados** (`set_snapshot_schedule` es rechazado por el plan) y ventana de restauración a punto-en-el-tiempo (PITR) de **6 horas** (`history_retention`). **Los snapshots manuales sí están permitidos en el plan free** — verificados por probe el 2026-09-21 (`create_snapshot` vía API/Neon MCP en la rama `main`).

### Backups — decisión: MANUALES (sin upgrade de plan)

Cadencia recomendada:
- **Antes de aplicar cualquier migración** o cambio riesgoso de esquema/datos (obligatorio).
- **Semanal** (respaldo lógico pg_dump), aunque no haya migraciones.
- Usar **ramas efímeras para experimentos** (nunca probar contra `main`).

Dos caminos soportados:

1. **Snapshot manual en Neon** (restore point de cuenta, restaurable desde la consola): consola Neon → proyecto → Branches → `main` → Create snapshot, o vía API/MCP (`create_snapshot` con `project_id=icy-union-17389410`, `branch_id=br-sweet-surf-axpwi30f`). Verificado funcional en plan free el 2026-09-21 (`manual-backup-probe-2026-09-21`).
2. **Respaldo lógico local con pg_dump**: `DATABASE_URL=... npm run db:backup` (script `scripts/db-backup.mjs`, sin dependencias). Escribe `backups/pescamar-backup-<fecha>.sql.gz` (directorio gitignored) con `--no-owner --no-privileges`, esquema + datos; `--schema-only` para solo esquema. **Requisito: pg_dump 18.x en el PATH** — debe coincidir con la versión mayor del servidor (PostgreSQL 18); el script falla con instrucciones si falta pg_dump, es de otra versión mayor, o falta `DATABASE_URL` (nunca se imprime).

Dónde viven los archivos: snapshots en Neon (vida útil según plan; revisar en Snapshots del proyecto); pg_dump en `./backups/` local (copiar a almacenamiento externo si se requiere retención larga — contienen datos operacionales completos, tratar como secretos).

Caveat honesto: la ventana PITR de 6 h del plan free es la única restauración autónoma sin snapshot previo; **un snapshot manual o un pg_dump tomado antes del cambio riesgoso es la red de seguridad real**. Fuera de ventana y sin snapshot, no hay copia.

- `pg_stat_statements` está instalado (v1.12): para consultas lentas, revisar la consola de Neon (Monitoring / query insights) o `select * from pg_stat_statements order by total_exec_time desc limit 20;` desde el SQL editor.
- Consumo/límites del plan en la consola de Neon → proyecto → Usage.

## 7. Incidentes — escalera de triage

**App caída / usuarios no entran:**
- [ ] ¿El monitor externo alertó? Replicar el probe humano de §2(a): ¿HTTP 200 + `status: live`?
- [ ] Abrir `/admin/salud` con sesión admin: ¿chip Operativa? ¿`Commit` = SHA esperado?
- [ ] ¿CI y Vercel en verde sobre el mismo SHA? (Deployments del repo). Si el último deploy es sospechoso → `git revert <sha> && git push`.
- [ ] ¿Caída solo de la API con SPA viva? Logs de funciones en Vercel → Logs; buscar errores 500 recientes por ruta.
- [ ] ¿Base de datos? `/api/schema-preflight` (¿DATABASE_URL caída da 503), consola Neon → estado del proyecto.

**Datos / esquema:**
- [ ] Verificar `schema_migrations` vs `db/migrations/` (deben coincidir exactamente; `db/README.md`).
- [ ] Pérdida de datos: restauración dentro de la ventana PITR de 6 h (crear rama desde punto-en-el-tiempo en Neon y extraer). Si hay un snapshot manual previo (§6), restaurar desde ese restore point aunque esté fuera de ventana. Fuera de ventana y sin snapshot ni pg_dump, no hay copia.

**Comunicación:** registrar hora (America/Santiago), SHA afectado, y avisar al responsable técnico con lo verificado arriba (hechos, no hipótesis).

## 8. Gobernanza

- **UX congelado post-piloto** (veredicto y evidencia en `docs/POST-PILOT.md`): no se iteran superficies de producto visibles por ahora.
- **Criterio de reactivación UX:** la fricción medida con evidencia en `/admin/pilotaje` (rutas visitadas, operadores activos, feedback Seafood AI) es la fuente que dispara la reactivación; cuando baje sostenidamente, se reactiva la iteración. La telemetría registra solo la ruta (nunca query strings) y el rol siempre se toma de la sesión en el servidor; no contiene PII.
- Cambios de esquema: solo vía migraciones versionadas en `db/migrations/` (§3). Cambios de código: siempre con la cadena CI completa en verde (§4).
