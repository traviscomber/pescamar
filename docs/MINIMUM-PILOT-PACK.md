# Pescamar — Minimum Pilot Pack

Objetivo: reunir sólo la información necesaria para operar un piloto completo del Seafood Intelligence OS sin inventar reglas, stock ni estados live.

## Alcance mínimo del piloto

- 1 planta real.
- 3 usuarios operativos con rol y alcance definidos.
- 5 proveedores habituales.
- 3 clientes habituales.
- 2 especies o líneas de producto representativas.
- 3 recepciones reales o controladas.
- 3 lotes con continuidad recepción → proceso → calidad → packing → inventario.
- 3 órdenes de venta.
- 3 despachos.
- 1 ciclo de liquidación/cierre comercial cuando aplique.

## Información requerida al cliente

### 1. Planta y ubicaciones

Entregar:
- Nombre oficial de la planta.
- Dirección y código interno, si existe.
- Líneas o áreas de proceso usadas en el piloto.
- Cámaras de frío, bodegas y ubicaciones físicas donde puede quedar producto.
- Nombres exactos que usa hoy el equipo para esas ubicaciones.

Validación humana requerida: confirmar qué nombres históricos equivalen a cada ubicación actual antes de relacionar histórico con la planta live.

### 2. Usuarios y responsabilidades

Por cada usuario:
- Nombre.
- Correo.
- Rol real en la operación.
- Planta(s) que puede ver.
- Acciones que puede ejecutar.
- Quién aprueba calidad.
- Quién autoriza despacho.
- Quién toma decisiones comerciales/materiales.

No se asumirán permisos a partir del cargo.

### 3. Proveedores, origen y recepción

Para al menos 5 proveedores:
- Razón social / nombre usado operativamente.
- Identificador o RUT, si corresponde.
- Orígenes o zonas habituales.
- Especies/productos entregados.

Adjuntar 3 ejemplos reales de documentos de recepción, idealmente:
- guía o documento equivalente;
- fecha/hora;
- proveedor;
- origen/zona;
- especie/producto;
- kg documentados;
- kg recibidos/pesados;
- observaciones;
- fotos/documentos que hoy se guardan como evidencia.

Indicar cómo se identifica actualmente un lote y cuándo se considera creada la recepción física.

### 4. Producción y transformación

Para las 2 especies/productos del piloto:
- Secuencia real de proceso.
- Nombre de cada etapa usado por el equipo.
- Entradas y salidas de peso registradas.
- Rendimiento esperado, si existe una regla aprobada.
- Mermas normales y cómo se justifican.
- Qué evento confirma que una etapa terminó.
- Qué datos se heredan desde recepción y cuáles deben capturarse en planta.

No se asumirá igualdad de masa entre entrada y salida: toda transformación debe conservar la explicación de rendimiento/conversión.

### 5. Calidad y liberación

Entregar:
- Checklist o controles reales de calidad.
- Estados usados hoy: por ejemplo pendiente, retenido, liberado, rechazado.
- Causas habituales de retención/rechazo.
- Documentos/fotos/mediciones que respaldan la decisión.
- Persona o rol autorizado para liberar producto.
- Reglas especiales por mercado o cliente, sólo si están formalmente vigentes.

La ausencia de un registro no se interpretará como control realizado ni como producto aprobado.

### 6. Packing e inventario

Entregar:
- Formatos de packing usados.
- Unidades comerciales: cajas, bandejas, pallets u otras.
- Códigos/etiquetas actuales.
- Relación producto → caja → pallet, si existe.
- Ubicaciones físicas de inventario.
- Un ejemplo de movimiento de entrada/salida de cámara o bodega.
- Stock inicial que el cliente desea reconocer como live, acompañado de evidencia de conteo/confirmación física.

El histórico no será promovido automáticamente a stock live.

### 7. Clientes, órdenes y despacho

Para al menos 3 clientes:
- Nombre comercial.
- Productos/especies habituales.
- Condiciones de entrega relevantes para operación.

Adjuntar 3 órdenes reales o anonimizadas con:
- cliente;
- producto;
- cantidad;
- fecha requerida;
- destino;
- observaciones/restricciones.

Adjuntar 3 ejemplos de despacho e indicar:
- qué documento confirma despacho;
- quién confirma físicamente la salida;
- cuándo una orden se considera cumplida/cerrada;
- cómo se manejan diferencias entre cantidad reservada y despachada.

### 8. Liquidación, costos y cierre

Si entra en el piloto, entregar:
- método de liquidación a proveedor;
- moneda;
- costos por lote que sí deben considerarse;
- costos de proceso/packing/frío/transporte si están disponibles;
- fórmula de margen o contribución aprobada por negocio;
- documento o evento que marca el cierre.

Si estos datos aún no están definidos, se mantienen como `needs-human-validation`; no se inventan márgenes ni costos.

### 9. Histórico

Confirmar expresamente:
- qué archivos históricos son sólo consulta;
- qué campos tienen calidad suficiente para auditoría;
- qué elementos, si alguno, serán reconciliados físicamente para iniciar estado live.

Ningún registro histórico pasa a inventario, lote activo, prioridad o compromiso actual sin confirmación explícita.

### 10. WhatsApp y documentos

Indicar:
- qué documentos suelen llegar por WhatsApp/correo;
- quién los envía;
- a qué entidad deben vincularse: recepción, lote, calidad, orden o despacho;
- qué campos sería útil extraer automáticamente;
- qué documento original debe conservarse como evidencia.

## Entrega recomendada

Una carpeta única con subcarpetas:

1. `01_PLANTA_USUARIOS`
2. `02_PROVEEDORES_RECEPCIONES`
3. `03_PRODUCCION`
4. `04_CALIDAD`
5. `05_PACKING_INVENTARIO`
6. `06_CLIENTES_ORDENES`
7. `07_DESPACHOS`
8. `08_COSTOS_LIQUIDACIONES`
9. `09_HISTORICO`
10. `10_WHATSAPP_DOCUMENTOS`

Formatos aceptables: XLSX/CSV, PDF, imágenes JPG/PNG y exportaciones del sistema actual. Mantener archivos originales cuando sean evidencia.

## Criterio de inicio del piloto

Podemos iniciar cuando estén confirmados, como mínimo:

- planta y ubicaciones;
- usuarios/roles;
- 3 recepciones/lotes con documentos;
- flujo productivo de las especies seleccionadas;
- reglas de calidad y responsable de liberación;
- ubicaciones de inventario;
- 3 órdenes y 3 despachos;
- definición explícita de qué histórico queda sólo como referencia.

Con ese set se ejecuta una prueba punta a punta:

`proveedor/origen → recepción → lote → producción → calidad → packing → inventario/frío → orden → despacho → liquidación/cierre`

Cada discrepancia se registra como excepción para validación humana, no se corrige por inferencia.