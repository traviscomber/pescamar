# Erizo — benchmark Marubeni Chile

## Objetivo

Usar el caso público de Marubeni Seafoods en Chile como benchmark de diseño para el proceso de erizo de Pescamar, sin copiar tecnología propietaria ni atribuir capacidades no verificadas.

Fuentes públicas:
- Marubeni Digital Innovation, “World’s First AI Sorting System for Chilean Sea Urchins: Solving Local Challenges Through Tailored Solutions”, 2025-04-07: https://www.marubeni.com/en/digital-innovation/journal/331/
- Marubeni Seafoods, Sea Urchin product page: https://www.marubeni-seafoods.com/en/product/index.html

## Qué resolvió Marubeni

El problema principal no fue detectar un erizo, sino reducir la variabilidad humana al clasificar roe por color. El valor comercial cambia con el grade y la mezcla de colores dentro de un envase puede generar reclamos y reinspección.

Marubeni describe cuatro decisiones relevantes:

1. Medición objetiva de color a partir de cámara.
2. Clasificación explicable y numérica en vez de depender sólo de un modelo black-box.
3. Hardware y UX adaptados a una planta chilena fría/húmeda y a operadores no técnicos.
4. Operación local autónoma: la solución debe ser simple de usar y no depender de especialistas para cada clasificación.

## Qué ya tenemos en Pescamar

`UniVisionStation` y `/api/sea-urchin-color` ya siguen este patrón:

- captura por cámara o foto;
- preservación de evidencia y SHA-256;
- segmentación del roe;
- medición CIELAB L*/a*/b*;
- dispersión interna como señal de homogeneidad;
- comparación por ΔE con referencias aprobadas de la planta;
- sugerencia de Grade A–E explicable;
- confirmación humana obligatoria;
- biblioteca de referencias administrada por Calidad;
- actualización del estado de color del proceso;
- hold si color, rayos X, etapa o etiqueta quedan fuera de condición;
- scope por planta y roles.

## Principios canónicos para Pescamar

### 1. Instrumento antes que “IA mágica”

La estación debe explicar por qué sugiere un resultado. CIELAB, dispersión y ΔE deben permanecer visibles en el detalle técnico. El operador decide; el sistema no libera automáticamente el lote.

### 2. Protocolo de captura controlado

Antes de comparar grades debemos estabilizar:

- iluminación;
- distancia de cámara;
- fondo;
- posición de muestra;
- dispositivo/cámara;
- limpieza de lente;
- ausencia de reflejos fuertes.

No fijar umbrales comerciales de ΔE o dispersión hasta contar con muestras reales aprobadas por Calidad.

### 3. Referencias reales por planta

Los grades A–E deben aprenderse desde muestras físicas aprobadas en Pescamar. No se deben inventar referencias globales ni asumir que una referencia externa equivale a una condición comercial propia.

### 4. Homogeneidad importa junto al color medio

Dos muestras pueden tener un color promedio parecido y una dispersión interna muy distinta. La estación debe conservar L*/a*/b* medios y sus desviaciones para poder evaluar mezcla de colores dentro de una muestra o lote.

### 5. Humano en el circuito

Una sugerencia de color/grade es evidencia de apoyo. Calidad confirma `accepted`, `review` o `ng`. La confirmación debe quedar auditada con actor y fecha.

### 6. Conectar calidad con negocio

Pescamar debe ir más allá del clasificador aislado. El dataset futuro debe permitir analizar:

`proveedor + zona + lote + materia prima + parámetros de proceso + moldeo + color + homogeneidad + grade + rayos X + packing + rendimiento + cliente/precio`

Esto permitirá responder qué materia prima y qué proceso producen de forma consistente el producto de mayor valor.

## Fases de implementación

### Fase A — actual

- mantener captura y medición explicable;
- construir referencias reales A–E por planta;
- exigir confirmación humana;
- preservar evidencia;
- mejorar UX para una estación simple de planta.

### Fase B — validación operacional

- protocolo físico de iluminación/cámara/fondo;
- comparar decisión del sistema vs Calidad;
- medir repetibilidad por operador y turno;
- evaluar dispersión/homogeneidad;
- documentar falsos positivos y condiciones de recaptura.

### Fase C — inteligencia de proceso

- correlacionar color/grade con proveedor, origen y etapas térmicas;
- correlacionar moldeo y homogeneidad con grade;
- rendimiento por grade;
- costo y margen por grade sólo cuando la trazabilidad económica esté completa.

### Fase D — hardware industrial

Sólo después de validar A–C decidir cámara, iluminación, carcasa, mini-PC/edge device y montaje definitivo para ambiente frío/húmedo. El benchmark Marubeni muestra que el endurecimiento de hardware viene después de validar el método, no antes.

## Regla de producto

La portada de Erizo sigue el patrón `Estado → Acción → Leer más`; el proceso interno no se simplifica. Erizo es una vertical MES/QA especializada y debe conservar profundidad técnica, evidencia y trazabilidad completa.