# Pescamar UX simplification

## Estado: congelado (POST-PILOT)

La UX está **congelada** desde el cierre del piloto (ver `docs/POST-PILOT.md`): no se aceptan cambios cosméticos ni ideas nuevas por iniciativa propia. Esta lista no autoriza trabajo; sólo ordena lo que se revisará **si** un usuario real del piloto demuestra fricción operacional. Criterio de reactivación: reporte con caso concreto → triaje P0/P1 → cambio + misma verificación (quality + Playwright desktop/mobile + smokes afectados + CI + Vercel en el mismo SHA).

## Marco: equipo mínimo de operación

El sistema está diseñado para tres responsables, no para una organización:

- **Operador/a de planta** — recepción, producción, packing, frío, inventario. Trabaja en estación y con móvil.
- **Comercial/administrativo** — órdenes, despachos, liquidaciones, créditos, costos. Cierra el día con evidencia.
- **Gerencia** — salud de plataforma, excepciones, decisiones y configuración. Incluye la experiencia ejecutiva (CEO).

Cualquier simplificación se evalúa contra este modelo: reduce pasos para estos tres perfiles o no se hace.

## Regla de entrada (evidence-required)

Ningún ítem entra sin los tres elementos:

1. **Fricción observada en piloto** — quién, qué flujo, cuánto tiempo/paso cuesta (dato, no opinión).
2. **Triaje** — P0 (bloquea operación diaria) o P1 (costo recurrente medible). Si no califica, se descarta.
3. **Cambio propuesto mínimo** — qué se quita o se acorta, sin añadir superficie nueva.

## Backlog candidato (a validar con evidencia; nada autorizado aún)

| # | Hipótesis de fricción | Perfil | Qué se simplificaría si se confirma |
|---|---|---|---|
| 1 | Doble entrada de contexto al moverse entre Hoy y el detalle de un lote | Operador | Heredar contexto de lote/planta ya abiertos sin re-selección |
| 2 | Cierre diario exige recorrer varias pantallas para confirmar que no queda nada pendiente | Comercial | Una sola vista de "listo para cerrar" con las excepciones restantes |
| 3 | Configuración dispersa entre módulos para el arranque de una planta nueva | Gerencia | Checklist único de activación con estado por paso |
| 4 | Captura móvil de proceso erizo con más campos de los que la estación usa | Operador | Formulario reducido al subconjunto usado en piso |

Estas hipótesis **no son compromisos**: se reescriben o se eliminan según lo que demuestre el piloto. Si una fricción reportada no encaja en ninguna fila, se añade como fila nueva con la misma regla de entrada.
