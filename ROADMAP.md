# Pescamar Control Multiplanta — Roadmap MVP

## Objetivo

Construir en 12 semanas un centro de control ejecutivo para visualizar el estado de las seis plantas de Pescamar a partir de importaciones periódicas de Excel. El MVP no reemplaza los sistemas operacionales: normaliza sus planillas y transforma los datos en producción, inventario y alertas comparables.

## Promesa del producto

> Toda la operación de Pescamar, en una sola pantalla.

Cada semáforo debe explicar qué ocurre, por qué ocurre, desde cuándo y cuál fue el archivo que originó el dato.

## Alcance del MVP

- Mosaico ejecutivo de seis plantas con semáforos explicables.
- Detalle por planta y producto.
- Producción, cumplimiento de meta e inventario resumido.
- Alertas de operación, calidad y vigencia de datos.
- Importación Excel con validación, vista previa e historial.
- Comparación multiplanta y filtros por período.
- Trazabilidad de archivo, fecha y responsable.
- Autenticación y permisos básicos.

## Fuera del MVP

- ERP financiero, facturación, compras y ventas.
- Inventario transaccional por movimiento.
- Órdenes de producción operadas desde el sistema.
- IoT, maquinaria, Sernapesca y UniGrade productivo.
- HACCP completo, logística y aprobaciones complejas.

## Plantas iniciales

| Planta | Modalidad | Productos |
| --- | --- | --- |
| Ancud | Propia | Erizo congelado |
| Quellón | Propia | Desconche de erizo, erizo terminado, pulpo, centolla, jaiba |
| Iquique (Sotomayor) | Maquila | Pulpo, erizo congelado, erizo fresco, palometa |
| Piedra Azul | Maquila y producto terminado | Centolla, salmón Chinook, corvina |
| Aqua Austral | Producto terminado | Merluza austral, congrio, salmón de cultivo |
| Natales | Producto terminado | Erizos, centolla, centollón, ostiones |

## Semáforos

- **Verde:** datos vigentes, cumplimiento dentro de rango y sin alertas críticas.
- **Amarillo:** desviación moderada, inventario bajo, alerta pendiente o actualización atrasada.
- **Rojo:** incumplimiento crítico, detención, bloqueo de calidad o desviación grave.
- **Gris:** sin datos vigentes o importación fallida.

El estado general se calcula desde reglas y siempre presenta una causa legible.

## Plan de 12 semanas

### Hito 1 — Centro de control (semanas 1–3)

- Modelo inicial de plantas, productos, KPIs y alertas.
- Mosaico ejecutivo responsive.
- Semáforos explicables y última actualización.
- Detalle básico de cada planta.
- Datos demostrativos coherentes para presentación.

**Criterio de aceptación:** desde la portada se identifican en menos de diez segundos las plantas que requieren atención y la causa principal.

### Hito 2 — Importación y normalización (semanas 4–7)

- [x] Plantilla canónica descargable en CSV compatible con Excel.
- [x] Carga XLSX/XLS/CSV, validación por fila y vista previa.
- [x] Publicación local de snapshots y recálculo inmediato de semáforos.
- Normalización planta–producto–período.
- [x] Historial local de los últimos 10 lotes y reversión de la publicación más reciente.
- [x] Archivo original, responsable y fecha de carga en la trazabilidad demostrativa.

**Criterio de aceptación:** un archivo válido actualiza KPIs y semáforos; uno inválido entrega errores accionables sin alterar datos publicados.

### Hito 3 — Inteligencia operacional (semanas 8–10)

- Reglas configurables de cumplimiento, rendimiento, merma e inventario.
- Alertas con gravedad, causa y estado.
- Comparador entre plantas y períodos.
- Tendencias y filtros ejecutivos.

**Criterio de aceptación:** cada alerta se puede rastrear hasta su indicador y archivo de origen.

### Hito 4 — Piloto y salida controlada (semanas 11–12)

- Autenticación y permisos básicos.
- Pruebas con planillas de las seis plantas.
- Auditoría, respaldo y observabilidad.
- Capacitación, documentación y despliegue.

**Criterio de aceptación:** piloto estable con las seis plantas, importaciones reproducibles y responsables capacitados.

## Riesgos principales

1. Variaciones entre las planillas reales de cada planta.
2. Definiciones distintas de producción, inventario y rendimiento.
3. Ausencia de metas para calcular los semáforos.
4. Datos atrasados o sin responsable identificable.
5. Expansión del alcance hacia un ERP completo durante el MVP.

## Estado actual

- [x] Persistencia operacional en PostgreSQL/Neon.
- [x] Recepciones con peso guía, peso recibido, tara, drenado y kilos aceptados.
- [x] Créditos y anticipos vinculados a proveedores, con movimientos auditables.
- [x] Liquidaciones desde recepciones aprobadas, precio por kilo y descuentos.
- [x] Recuperación automática de anticipos al aprobar una liquidación.
- [x] Bandeja única de decisiones con aprobación o rechazo y comentario obligatorio.
- [x] Operadores y roles para separar operación, finanzas y administración.
- [x] Importación y consulta de la fuente canónica 2025.

## Próximo incremento

Cerrar el piloto con identidad individual, matriz de permisos por planta, evidencia documental y pruebas de aceptación con los cinco operadores reales. Después del piloto, incorporar clasificación visual por calibre y color como un módulo independiente, sin mezclarlo con el flujo financiero ya estabilizado.
