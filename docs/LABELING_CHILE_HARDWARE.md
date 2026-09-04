# Seafood Intelligence OS — Etiquetado físico viable en Chile

## Decisión

Para Pescamar, el camino de menor riesgo y menor fricción es **impresión industrial Zebra por Ethernet + ZPL**, con el browser desacoplado del hardware mediante un **adapter local de planta**.

No hacer impresión directa desde el navegador como arquitectura primaria. La web crea un trabajo auditable; el adapter local lo toma, renderiza/envía ZPL a la impresora y sólo entonces confirma `sent` / `printed` o `failed`.

## Qué hacen los referentes

- JBT Marel integra weighing + labeling y separa claramente el trabajo de software del equipo físico; además ofrece etiquetado de cajas/crates y control de calidad de etiqueta.
- SATO trata el etiquetado como infraestructura AIDC industrial: impresora, etiquetas, software y soporte como un sistema completo, no como un botón de browser.
- Zebra ZT411/serie ZT400 ofrece conectividad industrial estándar: USB, serial, Ethernet 10/100 y ZPL; es una base adecuada para una estación de packing conectada por LAN.

## Hardware recomendado en Chile

### Perfil A — producción continua

**Zebra ZT411, 4 pulgadas, 203 o 300 dpi, Ethernet, transferencia térmica.**

Uso: packing de cajas, pallets y despacho; volumen sostenido. Ventaja principal: disponibilidad local, repuestos/insumos, soporte y ZPL estándar.

### Perfil B — menor volumen / estación secundaria

**Zebra ZT231, 4 pulgadas, Ethernet, transferencia térmica.**

Uso: estación de respaldo, línea de menor volumen o piloto. Mantiene el mismo patrón de integración para evitar dos stacks de software.

### Alternativa

SATO industrial es técnicamente viable, pero para Implementation 01 no conviene mantener dos protocolos hasta que exista una necesidad operacional concreta.

## Disponibilidad local observada

En Chile hay oferta local de ZT411/ZT231 y soporte/insumos a través de distribuidores especializados. Esto reduce el riesgo de depender de importación directa para el piloto y permite obtener equipos, ribbons, etiquetas, cabezales y servicio local.

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

- No comprar hardware automático Marel para el piloto.
- No incorporar RFID salvo requerimiento comercial/regulatorio real.
- No soportar simultáneamente muchos lenguajes de impresora.
- No usar USB como topología principal de planta si Ethernet está disponible.
- No declarar impresión exitosa por haber enviado un request desde el browser.
