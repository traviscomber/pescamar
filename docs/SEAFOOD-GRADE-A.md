# Seafood Intelligence Grade A

Objetivo: llevar Seafood Intelligence OS desde control operacional confiable a inteligencia anticipatoria, sin inventar evidencia ni aumentar carga del equipo de planta.

## Principios de cierre

- Live primero; histórico y canonical permanecen separados hasta validación explícita.
- Cada conclusión material debe distinguir evidencia observada, interpretación, incertidumbre, acción y confianza.
- No crear dashboards por crear: las nuevas capacidades deben reducir revisión manual y escalar sólo excepciones.
- Toda inteligencia predictiva requiere baseline validado; hasta entonces las métricas son descriptivas/derivadas.
- Decisiones regulatorias, de calidad y comerciales materiales conservan aprobación humana.

## Capas Grade A

1. Yield Intelligence
   - input/output/yield por lote cuando la evidencia existe.
   - detectar evidencia incompleta o balances físicamente inconsistentes.
   - siguiente fase: baseline por especie, proveedor, origen, proceso y temporada.

2. Order Fulfilment Intelligence
   - continuidad compromiso -> despacho -> venta.
   - detectar despacho sobre asignación y venta sobre despacho cuando todos los kilos son observables.
   - siguiente fase: forecast de cobertura por fecha de entrega con inventario y producción futura.

3. Margin per Lot
   - compra -> transformación -> packing -> frío -> logística -> venta -> margen.
   - no proyectar margen hasta contar con costos completos y fórmula validada.

4. Exception Engine
   - priorizar sólo anomalías verificables: pesos, rendimiento no evaluable, inventario inválido, evidencia faltante, continuidad comercial, visión pendiente y frío cuando existan límites fuente.

5. Supplier Intelligence
   - comparar rendimiento, variabilidad, calidad, cumplimiento y resultado económico por proveedor.
   - requiere muestra mínima y ventanas temporales explícitas para evitar rankings engañosos.

6. Predictive / What-if
   - disponibilidad futura, cumplimiento de órdenes, capacidad, frío y escenarios.
   - se habilita sólo después del Minimum Pilot Pack y validación de baselines.

## Grade A contract

Un dominio se considera Grade A cuando cumple simultáneamente:

A. Identidad y continuidad: cada kilo material puede seguirse por lote y transformación.
B. Evidencia: cada métrica o excepción puede mostrar su fuente.
C. Excepción automática: el usuario no necesita revisar todas las pantallas para detectar un problema.
D. Impacto: cuando existe evidencia económica/operacional suficiente, la decisión muestra impacto y responsable.
E. Forward-looking: la predicción usa un baseline validado, no heurísticas sin evidencia.

## CPU / deployment discipline

- Agrupar cambios relacionados en un único commit de release.
- Evitar previews y deployments por archivo.
- Preferir inteligencia determinística pura sobre eventos ya cargados antes de agregar queries o funciones nuevas.
- No agregar cron jobs para métricas que pueden calcularse on-demand desde el Seafood Event Graph.
- Medir primero; materializar/cachar sólo si la latencia o costo real lo justifican.

## Estado actual

La primera capa Grade A se calcula dentro de Operational Intelligence sin consultas adicionales: yield descriptivo, continuidad compromiso-despacho-venta, cobertura comercial y excepciones asociadas. `predictiveBaselineAvailable` permanece `false` hasta recibir y validar datos reales del piloto.
