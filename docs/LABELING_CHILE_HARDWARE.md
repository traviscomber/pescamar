# Seafood Intelligence OS — Etiquetado físico viable en Chile

## Decisión

Para Pescamar, el camino de menor riesgo y menor fricción es **impresión industrial Zebra por Ethernet + ZPL**, con el browser desacoplado del hardware mediante un **adapter local de planta**.

No hacer impresión directa desde el navegador como arquitectura primaria. La web crea un trabajo auditable; el adapter local lo toma, renderiza/envía ZPL a la impresora y sólo entonces confirma `sent` / `printed` o `failed`.

La compra de hardware queda **diferida**. Este documento define el plan completo, las referencias técnicas, el BOM preliminar y el gate de decisión. Primero se termina y valida el software; después se cotiza y se decide qué comprar.

## Qué hacen los referentes

- JBT Marel integra weighing + labeling y separa claramente el trabajo de software del equipo físico; además ofrece etiquetado de cajas/crates y control de calidad de etiqueta.
- SATO trata el etiquetado como infraestructura AIDC industrial: impresora, etiquetas, software y soporte como un sistema completo, no como un botón de browser.
- Zebra ZT411/serie ZT400 ofrece conectividad industrial estándar: USB, serial, Ethernet y ZPL; es una base adecuada para una estación de packing conectada por LAN.

## Hardware recomendado en Chile

### Perfil A — producción continua

**Zebra ZT411, 4 pulgadas, 203 o 300 dpi, Ethernet, transferencia térmica.**

Uso: packing de cajas, pallets y despacho; volumen sostenido. Ventaja principal: disponibilidad local, repuestos/insumos, soporte y ZPL estándar.

### Perfil B — menor volumen / estación secundaria

**Zebra ZT231, 4 pulgadas, Ethernet, transferencia térmica.**

Uso: estación de respaldo, línea de menor volumen o piloto. Mantiene el mismo patrón de integración para evitar dos stacks de software.

### Alternativa

SATO industrial es técnicamente viable, pero para Implementation 01 no conviene mantener dos protocolos hasta que exista una necesidad operacional concreta.

## Arquitectura

```text
Seafood Intelligence OS
        |
        v
label_print_jobs (queued)
        |
        v
Pescamar Print Adapter (PC/mini-PC en planta)
        |
        +--> render template -> ZPL
        +--> TCP/LAN -> Zebra ZT411/ZT231
        |
        v
sent -> printed / failed
        |
        v
Seafood Event Graph + auditoría
```

## Plan completo de implementación

### Fase 1 — Software sin compra de hardware

Objetivo: dejar Seafood Intelligence OS listo para recibir una impresora real sin cambiar el core.

- [x] Cola auditable de impresión.
- [x] Packing unit trazada.
- [x] Etiqueta validada como gate obligatorio.
- [x] Plantilla versionada.
- [x] Impresora/dispositivo registrado por estación.
- [x] Idempotencia y reimpresión vinculada al job original.
- [ ] Pescamar Print Adapter local.
- [ ] Render ZPL desde plantilla versionada.
- [ ] Poll seguro de trabajos por planta/estación.
- [ ] Estados `queued -> sent -> printed / failed`.
- [ ] Timeout, retry acotado y manejo offline.
- [ ] Health check del adapter y de la impresora.
- [ ] Test de integración sin hardware usando simulador/mock ZPL.

**Gate:** el flujo completo funciona contra un adapter simulado y no declara `printed` antes de confirmación física.

### Fase 2 — Levantamiento físico en planta

Antes de comprar:

- [ ] Elegir planta piloto y estación exacta de packing.
- [ ] Confirmar volumen de etiquetas por turno/día.
- [ ] Confirmar tamaño final de etiqueta.
- [ ] Confirmar ambiente: humedad, frío, salpicaduras y limpieza.
- [ ] Confirmar distancia entre PC/mini-PC, switch e impresora.
- [ ] Confirmar red disponible y política de IP fija/DHCP reservation.
- [ ] Confirmar si existe PC reutilizable en packing.
- [ ] Confirmar si existe UPS/switch reutilizable.
- [ ] Confirmar necesidad de scanner dedicado o reutilización de scanner existente.
- [ ] Confirmar material de etiqueta y adhesivo compatible con frío/humedad.

**Gate:** BOM definitivo basado en condiciones reales, no en supuestos.

### Fase 3 — Cotización y decisión de compra

Solicitar al menos dos cotizaciones locales equivalentes y comparar:

- disponibilidad inmediata;
- garantía y soporte local;
- cabezal/repuestos disponibles;
- precio de ribbons y etiquetas recurrentes;
- Ethernet incluido;
- resolución 203 vs 300 dpi;
- costo total de propiedad, no sólo precio inicial.

La decisión será entre:

1. **ZT411** para estación principal / uso continuo.
2. **ZT231** para piloto de menor volumen o estación secundaria.
3. **No comprar mini-PC** si un PC existente cumple el rol del Print Adapter.
4. **No comprar scanner/UPS/switch** si ya existen equipos aptos en planta.

**Gate:** aprobación explícita del BOM definitivo antes de emitir compra.

### Fase 4 — Instalación y configuración

- [ ] Montaje físico.
- [ ] LAN cableada e IP estable.
- [ ] Configuración Zebra/ZPL.
- [ ] Instalación del Pescamar Print Adapter.
- [ ] Registro de estación y dispositivo en Seafood Intelligence OS.
- [ ] Plantilla real calibrada al tamaño de etiqueta.
- [ ] Prueba de barcode/QR según template.
- [ ] Prueba de impresión desde packing unit real.
- [ ] Prueba de impresora offline.
- [ ] Prueba de reintento.
- [ ] Prueba de reimpresión auditada.
- [ ] Capacitación breve al operador.

### Fase 5 — UAT operacional

- [ ] 20 impresiones consecutivas correctas.
- [ ] Lectura correcta con scanner.
- [ ] Correspondencia caja ↔ etiqueta ↔ lote.
- [ ] Cero duplicados no autorizados.
- [ ] Reimpresión queda vinculada al job fuente.
- [ ] Fallo físico no aparece como `printed`.
- [ ] Evidencia disponible en auditoría/Event Graph.
- [ ] Aceptación humana del responsable de packing.

**Gate final:** estación de etiquetado LIVE.

## Lista de compra de referencia — NO APROBADA AÚN

Valores sólo para dimensionar presupuesto. Deben revalidarse con cotizaciones vigentes antes de comprar.

| Ítem | Cantidad ref. | Referencia | Presupuesto ref. CLP |
| --- | ---: | --- | ---: |
| Impresora industrial | 1 | Zebra ZT411 Ethernet, transferencia térmica | 1.110.000 |
| Mini-PC para Print Adapter | 1 | Intel N100, 16 GB RAM, SSD 512 GB, LAN Gigabit | 400.000 |
| UPS | 1 | 1000 VA aprox. | 131.000 |
| Scanner 2D | 1 | Zebra DS2208 USB con base o equivalente | 122.000 |
| Switch Ethernet | 1 | Gigabit 5 puertos | 15.000 |
| Patch cords Cat6 | 2 | 3–5 m | 20.000 |
| Etiquetas PP 100 × 150 mm | 5 rollos | 500 etiquetas/rollo, referencia inicial | 85.000 |
| Ribbon resina 110 × 450 m | 3 | Compatible con PP | 108.000 |
| Kit de limpieza | 1 | IPA + wipes/swabs | 20.000 |
| Soporte/canalización menor | 1 | Instalación física | 50.000 |

**Subtotal de referencia hardware + insumos:** ~**2.061.000 CLP**.

### Instalación y configuración

Para estimación comercial inicial, reservar **20% adicional** sobre el BOM de referencia para:

- instalación física;
- configuración LAN/IP;
- configuración ZPL;
- instalación del Print Adapter;
- registro en Seafood Intelligence OS;
- calibración de plantilla;
- pruebas E2E;
- capacitación del operador.

Referencia actual: ~**412.000 CLP**.

**Proyecto de referencia completo:** ~**2.473.000 CLP** antes de revalidar cotizaciones y reutilización de hardware existente.

No convertir este valor en orden de compra. El monto debe bajar si Pescamar ya dispone de PC, scanner, UPS, switch o infraestructura de red adecuada.

## Adapter local

Primera versión:

- Windows mini-PC o PC existente en packing.
- Conexión LAN cableada a la impresora.
- Poll de trabajos pendientes autorizado para una planta/estación específica.
- ZPL enviado por TCP/IP a la impresora.
- Timeout y retry acotados.
- Nunca marcar `printed` al crear la cola.
- Reimpresión siempre vinculada al job original.
- Guardar identificador de impresora, plantilla/version y payload snapshot ya existente.

No guardar contraseñas de impresora en browser ni exponer la LAN de planta a Internet.

## UX operador

La pantalla diaria no debe mostrar fabricante, protocolo, JSON ni configuración.

```text
Etiquetado

Listo para imprimir
Caja IQF-001 · 20,4 kg
Impresora Packing 01

[ Imprimir etiqueta ]

Ver detalle
```

Si falta algo, mostrar una sola acción:

- impresora ausente -> `Conectar impresora`
- etiqueta no validada -> `Validar etiqueta`
- plantilla ausente -> `Configurar plantilla`
- job fallido -> `Revisar impresión`

## Viabilidad de automatización futura

Cuando el volumen lo justifique, la arquitectura puede evolucionar hacia weigh-price-labeling y aplicadores automáticos tipo Marel sin cambiar la semántica central del OS. El evento sigue siendo `packing unit -> etiqueta validada -> print job -> impresión confirmada`.

## No hacer todavía

- No emitir orden de compra hasta terminar levantamiento físico y adapter simulado.
- No comprar hardware automático Marel para el piloto.
- No incorporar RFID salvo requerimiento comercial/regulatorio real.
- No soportar simultáneamente muchos lenguajes de impresora.
- No usar USB como topología principal de planta si Ethernet está disponible.
- No declarar impresión exitosa por haber enviado un request desde el browser.
