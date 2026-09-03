# Pescamar — Canonical Data Intake Runbook

## Objetivo

Dejar la plataforma preparada para recibir nuevas planillas sin convertir un archivo recibido en verdad operacional por accidente.

Toda fuente nueva sigue esta secuencia:

1. **Preflight de solo lectura.**
2. **Auditoría de estructura y linaje.**
3. **Aprobación explícita de la fuente canónica.**
4. **Publicación a staging canónico.**
5. **Revisión de calidad, conexiones y cobertura.**
6. **Promoción operacional sólo mediante un flujo separado y autorizado.**

Nunca se salta directamente desde XLSX a recepciones, inventario, ventas, liquidaciones o pagos.

---

## 1. Antes de recibir la data

La aplicación debe mantener:

- producción en `main` estable;
- esquema/migraciones reconciliadas;
- `canonical_source_files` como registro de autoridad;
- importaciones canónicas append-only por linaje;
- previews Neon aislados para cualquier prueba que escriba;
- cero P0/P1 conocidos en el flujo de importación.

El endpoint `POST /api/canonical-preflight` existe precisamente para analizar un archivo sin publicarlo.

---

## 2. Preflight

Enviar:

```json
{
  "fileName": "planilla de produccion 2026.xlsx",
  "base64": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,..."
}
```

El preflight devuelve, entre otros:

- SHA-256 calculado;
- tamaño del archivo;
- tipo de fuente candidata;
- hojas presentes y dimensiones;
- hojas requeridas faltantes;
- conteos de filas reconocibles;
- problemas estructurales detectados;
- si nombre + hash coinciden con una fuente canónica ya aprobada;
- `writesStaging=false` y `writesLive=false`.

Un preflight correcto **no significa** que el archivo esté autorizado para publicar.

---

## 3. Fuentes actualmente reconocidas

### Producción 2026

Archivo esperado:

`planilla de produccion 2026.xlsx`

Hoja requerida:

`Producción Pescamar 2026`

Grano canónico principal:

una fila operacional de producción/recepción por fila fuente con lote informado.

### Cuenta / stock / transferencias

Archivo esperado:

`CUENTA2.xlsx`

Hojas requeridas:

- `CUENTA CORRIENTE`
- `STOCK FISICO ERIZOS`
- `STOCK PULPO`
- `TRANSF RECIBIDAS`

Granos canónicos:

- movimiento financiero fechado;
- registro/snapshot de stock según hoja;
- transferencia recibida.

### Packing pulpo

Archivo esperado:

`packing pulpo pescamar 2026-2.xlsx`

Hojas requeridas:

- `BLOQUE`
- `IQF`

Grano canónico:

una caja física por fila cuando existe número de caja válido.

---

## 4. Cuando llegue un archivo con hash nuevo

No agregar el hash automáticamente.

Antes de registrarlo como canónico:

1. calcular y conservar SHA-256;
2. verificar que el archivo sea el original recibido y no una copia modificada;
3. auditar hojas, fórmulas, filas ocultas, fechas, unidades, duplicados, identificadores y granularidad;
4. definir el grano de cada hoja en una frase;
5. separar datos fuente de resúmenes, fórmulas y auxiliares;
6. confirmar período y responsable de la fuente;
7. registrar anomalías como flags, no corrigiendo silenciosamente el original;
8. comparar el archivo con el modelo canónico y módulos actuales;
9. aprobar explícitamente nombre + hash + `source_kind` + período + conteo esperado;
10. registrar la fuente mediante cambio controlado/migración revisable.

Si cualquiera de esos puntos es ambiguo, el archivo queda en revisión y no se publica.

---

## 5. Publicación staging

Sólo después de que `registeredCanonical=true`:

- usar el flujo existente de `canonical-upload`;
- confirmar resultado idempotente;
- comparar `sourceRecordCount` con el conteo auditado;
- confirmar que el replay exacto no sobrescribe evidencia;
- verificar `/api/canonical-status`;
- verificar `/api/canonical-connections`;
- revisar la cola canónica de producción cuando corresponda.

La publicación canónica no debe crear hechos live.

---

## 6. Gate posterior a la carga

La carga queda **PASS para staging** cuando:

- hash y nombre corresponden al registro aprobado;
- estructura esperada presente;
- conteo observado explicado;
- linaje fuente + hoja + fila preservado;
- cero overwrite de evidencia existente;
- flags y anomalías visibles;
- conexiones exactas separadas de ambiguas;
- gaps de cobertura diferenciados de errores de matching;
- ningún dato ambiguo promovido a operación live.

La carga queda **HOLD** si existe diferencia inexplicada de filas, cambio de estructura, hoja faltante, hash no aprobado, fórmula crítica sin resultado confiable, fecha/unidad ambigua o cualquier intento de reinterpretar evidencia histórica sin respaldo.

---

## 7. Promoción operacional

Staging canónico y operación live son dominios distintos.

La promoción requiere un flujo explícito por entidad y debe conservar:

- fuente original;
- decisión humana o regla determinística aprobada;
- actor;
- timestamp;
- planta/alcance;
- idempotencia;
- auditoría;
- posibilidad de reconstruir por qué ese registro llegó a operación.

No inferir recepciones, stock disponible, ventas, deuda, caja o liquidaciones sólo porque exista una fila histórica parecida.

---

## 8. Checklist de recepción de data

Cuando Pescamar entregue nuevos archivos, recopilar junto al archivo:

- nombre original;
- quién lo generó;
- fecha/hora de exportación;
- sistema o proceso de origen;
- planta(s) cubiertas;
- período cubierto;
- moneda(s);
- unidad(es) de peso;
- definición de lote/guía/caja utilizada;
- si contiene fórmulas o valores pegados;
- si reemplaza una fuente anterior o agrega un período nuevo;
- responsable funcional que puede validar el contenido.

Con eso disponible, el siguiente paso es ejecutar el preflight y el Canonical Intake sobre el archivo real, no modificar el sistema a ciegas.
