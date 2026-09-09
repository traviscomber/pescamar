# Pescamar UX Closure

Objetivo: llevar la experiencia de Pescamar — Implementation 01 a **9,5+/10 lista para piloto** sin abrir desarrollo horizontal infinito.

## Regla de alcance

Una mejora UX entra en este programa sólo si reduce fricción de una tarea real, mejora comprensión, corrige navegación/jerarquía/accesibilidad, o elimina una inconsistencia visual sistémica. No se agregan módulos ni datos ficticios para mejorar una pantalla.

Canonical Intake protege la fuente de verdad: etiquetas normalizadas y ayudas de interfaz pueden ser más simples, pero nunca reescriben valores fuente, lotes, proveedores, fechas, pesos, moneda, calidad ni lineage.

## UX-1 · Navegación y lenguaje — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- cuatro workspaces diarios claros;
- flujo físico de planta ordenado y completo;
- Packing y Pallets separados;
- Pescamar visible como implementación del Seafood Intelligence OS;
- conceptos humanos antes que siglas o nombres internos;
- identidades técnicas preservadas como metadata separada cuando son canónicas;
- administración reservada para tareas poco frecuentes;
- contrato CI que impida regresar a jerga o navegación ambigua.

## UX-2 · Jerarquía de tareas — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- una tarea principal por pantalla crítica;
- siguiente acción evidente;
- estados normales silenciosos y excepciones primero;
- detalle técnico bajo demanda;
- sin doble frame ni CTA primarios repetidos en Recepciones, Ficha 360, Packing, Pallets, Frío, Inventario y Órdenes;
- contrato CI que impida volver a títulos genéricos o acciones duplicadas.

## UX-3 · Mobile y accesibilidad — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- navegación utilizable con una mano;
- targets mínimos de 44 px;
- sin overflow horizontal del documento;
- foco visible, orden lógico, Escape/cancelación y labels accesibles;
- recepciones activas e históricas recompuestas en tarjetas semánticas en móvil en vez de comprimir columnas;
- valores canónicos conservados sin transformación de datos.

## UX-4 · Verificación y cierre — PENDIENTE

Criterio de salida:
- Quality PASS;
- Chromium desktop/mobile PASS;
- Vercel SUCCESS en el mismo SHA;
- revisión visual autenticada cuando haya navegador disponible;
- cero P0/P1 UX abiertos.

Después de UX-4, cualquier mejora cosmética o nueva idea pasa a POST-PILOT salvo que un usuario real del piloto demuestre fricción operacional.