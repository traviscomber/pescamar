# Pescamar ERP — Design System Canónico

**Versión:** 2.0  
**Estado:** CANÓNICO  
**Última actualización:** 2 septiembre 2026  
**Producto:** Pescamar ERP · N3uralia  

Este documento es la **fuente única de verdad visual, de interacción y de experiencia** para Pescamar ERP. Toda pantalla nueva, refactor visual, componente compartido o cambio responsive debe cumplir estas reglas antes de llegar a producción.

`DESIGN.md` prevalece sobre capturas antiguas, estilos ad hoc y decisiones visuales aisladas. Si código existente contradice este documento, el código debe converger gradualmente hacia este sistema sin romper funcionalidad ni datos.

---

## 1. Norte de diseño

Pescamar convierte una operación pesquera compleja, multiplanta y altamente trazable en decisiones simples para un equipo pequeño.

La interfaz debe comunicar en menos de cinco segundos:

1. dónde estoy;
2. qué está ocurriendo;
3. qué requiere mi atención;
4. qué acción puedo ejecutar;
5. qué evidencia sostiene esa acción.

### Promesa de diseño

> **Operación compleja, control sereno.**

Pescamar debe sentirse como una plataforma industrial premium: sobria, precisa, rápida, marítima y confiable. No debe parecer un dashboard genérico, una colección de cards ni un prototipo de administración.

### Personalidad visual

- Industrial marítima.
- Técnica sin verse fría.
- Premium sin decoración gratuita.
- Densa cuando la tarea lo exige, nunca congestionada.
- Calma en operación normal; enfática sólo ante riesgo real.
- Ejecutiva en gerencia, táctil y directa en piso de planta.

---

## 2. Principios obligatorios

1. **Una tarea principal por pantalla.** Título, contenido dominante y CTA principal deben responder al mismo objetivo.
2. **Control por excepción.** Lo normal permanece silencioso; lo que requiere criterio humano aparece primero.
3. **Datos reales o vacío honesto.** Nunca inventar KPI, tendencias, operadores, estados o actividad.
4. **Divulgación progresiva.** Resumen primero, evidencia después, detalle profundo bajo demanda.
5. **Una sola expresión por estado.** No repetir la misma condición en banner + card + badge + alerta.
6. **Color con significado.** El color comunica identidad, selección, riesgo o estado. No decora.
7. **Jerarquía antes que contenedores.** Usar espacio, tipografía, divisores y alineación antes de agregar otra card.
8. **Objeto antes que dashboard.** En Ficha 360, lotes, recepciones, pallets y cierres, el objeto operativo domina la vista.
9. **Corporativo por defecto, planta por contexto.** La red se resume; la operación se ejecuta dentro de una planta o lote concreto.
10. **Mobile se recompone, no se comprime.** Nunca resolver responsive reduciendo tipografía hasta volverla ilegible.
11. **La función manda.** Ninguna mejora estética puede ocultar datos, permisos, evidencia o acciones operacionales.
12. **Consistencia sistémica.** Corregir tokens y componentes compartidos antes de parchear una pantalla individual.

---

## 3. Arquitectura visual

Pescamar utiliza **máximo tres niveles de superficie**:

1. `page`: fondo global de aplicación;
2. `surface`: área primaria de trabajo;
3. `surface-2`: agrupación secundaria o elemento interactivo.

`surface-3` puede existir sólo para estados especiales, campos complejos o agrupaciones técnicas puntuales. No debe crear un cuarto nivel visual dominante.

### Regla anti-frame

Un frame sólo existe si aporta al menos una de estas funciones:

- agrupa contenido inseparable;
- define interacción;
- separa un contexto operacional;
- contiene scroll propio;
- establece elevación modal/drawer.

**Prohibido:** card dentro de card dentro de card.

Si un bloque puede separarse con `gap`, título, divisor o whitespace, no necesita otra superficie.

### Doble frame

Se considera defecto P1 cuando un mismo contenido queda encerrado por dos bordes/superficies sin una razón funcional clara.

Ejemplos a eliminar:

- panel exterior + card interior idéntica;
- tabla dentro de panel dentro de panel;
- encabezado de sección dentro de una card que ya tiene título externo;
- resumen KPI rodeado por otro resumen sin cambio de contexto.

---

## 4. Color — tokens canónicos

Los componentes deben consumir variables semánticas. No se introducen hex nuevos directamente en componentes sin actualizar primero este documento y los tokens globales.

### Tema claro

| Token | Valor | Uso |
|---|---:|---|
| `--page` | `#F2F6F7` | Fondo global |
| `--surface` | `#FFFFFF` | Superficie primaria |
| `--surface-2` | `#F6F9FA` | Superficie secundaria |
| `--surface-3` | `#EEF4F5` | Superficie terciaria limitada |
| `--text` | `#102532` | Texto principal |
| `--muted` | `#667C86` | Texto secundario |
| `--line` | `#D5E0E4` | Bordes/divisores |
| `--ocean` | `#0E4370` | Marca, selección, navegación, CTA |
| `--ocean-2` | `#0A3559` | Hover/pressed de Ocean |
| `--ocean-soft` | `#E9F1F7` | Fondo de selección/info |
| `--teal` | `#567F7D` | Confirmación sobria y acento operativo |
| `--teal-2` | `#739694` | Acento secundario |
| `--success` | `#247452` | Estado correcto |
| `--warning` | `#94631F` | Atención real |
| `--danger` | `#AA3F35` | Riesgo, bloqueo o rechazo |

### Tema oscuro

| Token | Valor | Uso |
|---|---:|---|
| `--page` | `#071018` | Fondo global |
| `--surface` | `#0C1720` | Superficie primaria |
| `--surface-2` | `#111E27` | Superficie secundaria |
| `--surface-3` | `#16252F` | Superficie terciaria limitada |
| `--text` | `#E8F1F4` | Texto principal |
| `--muted` | `#93A6AF` | Texto secundario |
| `--line` | `#253944` | Bordes/divisores |
| `--ocean` | `#76A6C7` | Marca, selección, navegación |
| `--ocean-2` | `#9FC4DC` | Hover/pressed |
| `--ocean-soft` | `#102737` | Fondo de selección/info |
| `--teal` | `#739694` | Confirmación sobria |
| `--teal-2` | `#93AAA8` | Acento secundario |
| `--success` | `#62B690` | Estado correcto |
| `--warning` | `#D7AD67` | Atención real |
| `--danger` | `#E58F86` | Riesgo, bloqueo o rechazo |

### Reglas de color

- Ocean es el acento de identidad y navegación.
- Teal se reserva para confianza, confirmación, conectividad o acción secundaria positiva.
- `success`, `warning` y `danger` son exclusivamente semánticos.
- Un dato pendiente de configuración es neutro; no es warning.
- No usar naranja decorativo.
- No usar rojo para variaciones negativas normales de una métrica; rojo implica riesgo o acción requerida.
- No llenar paneles completos con colores semánticos. Preferir borde, icono, badge y fondo de baja intensidad.
- Gradientes decorativos saturados están prohibidos. Mezclas tonales de muy bajo contraste pueden usarse sólo en shell o superficies hero/command-deck y nunca deben competir con datos.
- Contraste mínimo WCAG AA: `4.5:1` texto normal, `3:1` texto grande/componentes.

---

## 5. Tipografía

### Familias

- **Rajdhani:** títulos, cifras principales, overlines, estados breves y labels de sistema.
- **Montserrat:** cuerpo, navegación, formularios, tablas, ayudas, notas y contenido operacional.

No agregar una tercera familia tipográfica.

### Escala canónica

| Rol | Tamaño recomendado | Peso | Fuente |
|---|---:|---:|---|
| Display / command | `40–44px` desktop | 600 | Rajdhani |
| H1 | `30–40px` | 600 | Rajdhani |
| H2 | `18–24px` | 600 | Rajdhani |
| H3 | `15–18px` | 600 | Rajdhani |
| KPI grande | `26–32px` | 600 | Rajdhani |
| Body | `13–14px` | 400–500 | Montserrat |
| UI / controles | `12–13px` | 500–600 | Montserrat |
| Tabla | `11–12px` | 400–600 | Montserrat |
| Meta | `10–11px` | 500 | Montserrat |
| Overline | `9–10px` | 600–700 | Rajdhani |

### Reglas

- Información operacional importante nunca baja de `12px`.
- `10–11px` sólo para metadata secundaria, timestamps, IDs y labels auxiliares.
- Evitar texto ultralight.
- H1 máximo dos líneas en escritorio.
- El cuerpo usa `line-height: 1.45–1.6`.
- Números, kg, porcentajes, CLP y USD usan `font-variant-numeric: tabular-nums` cuando ayuda a comparar.
- La jerarquía se construye con tamaño + espacio + contraste; no con múltiples colores o pesos extremos.

---

## 6. Espaciado y geometría

### Escala espacial

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

Valores fuera de la escala requieren justificación.

### Layout

- Ancho máximo principal: `1480px`.
- Padding desktop amplio: `28–40px`.
- Padding tablet: `18–24px`.
- Padding mobile: `14–18px`.
- Separación header → contenido: `22–30px`.
- Separación entre secciones mayores: `24–32px`.
- `gap` entre elementos relacionados: `8–16px`.

### Radios

| Elemento | Radio |
|---|---:|
| Inputs / buttons / nav | `7px` |
| Cards / panels | `8–10px` |
| Modal / command deck | `10–12px` |
| Badge de estado | `5px` |
| Avatar pequeño | `6–8px` |

- No usar pill radius en botones normales.
- Pills se reservan para filtros, segmentos compactos o estados cuando la forma ayuda a reconocerlos.
- No superar `12px` en superficies operacionales regulares.

### Bordes

- `1px` por defecto.
- Fríos, discretos, con `--line` o mezcla semántica.
- No usar bordes gruesos para jerarquía normal.
- Divisores horizontales son preferibles a nuevas cards en listas y ledgers.

### Sombras

- Sin sombra en cards estándar.
- Sombra sólo para modales, drawers, popovers o elevación transitoria.
- Hover no debe hacer “flotar” todas las cards.

---

## 7. App shell

### Estructura desktop

- Sidebar: `268px`.
- Workspace: `minmax(0, 1fr)`.
- Topbar: `64–68px`.
- Main content: máximo `1480px`.

### Sidebar

La sidebar debe sentirse como infraestructura, no como un panel de marketing.

Reglas:

- fondo oscuro marítimo estable en ambos temas;
- iconografía lineal consistente;
- grupos claramente etiquetados;
- items `40–42px` de alto;
- estado activo con contraste suave + indicador lateral de `2px`;
- sin cards dentro de la navegación salvo un bloque operacional que realmente aporte contexto;
- no mostrar módulos inaccesibles a un rol, salvo que exista una razón explícita de producto para explicar permisos;
- sección `Más módulos` sólo para navegación secundaria, no para esconder tareas frecuentes.

### Topbar

Debe mostrar sólo contexto que ayude a operar:

- planta/contexto actual;
- estado de plataforma cuando sea relevante;
- identidad del operador;
- tema/apariencia si corresponde.

No duplicar breadcrumbs, título y selector de planta si expresan lo mismo.

### Mobile navigation

- navegación principal accesible con una mano;
- menú no puede ocultar la tarea actual;
- CTA principal debe permanecer visible cuando sea crítico;
- evitar una sidebar desktop simplemente reducida.

---

## 8. Jerarquía de página

Orden estándar:

1. contexto / overline opcional;
2. H1;
3. descripción de una línea;
4. máximo dos acciones, sólo una primaria;
5. estado o resumen dominante;
6. superficie principal de trabajo;
7. evidencia / detalle secundario;
8. actividad histórica o técnica.

### `PageHeader`

Debe ser el patrón común.

- ancho de texto máximo: `720–760px`;
- H1 `30–40px` desktop;
- descripción breve;
- no incluir métricas dentro del header;
- máximo dos acciones visibles;
- mobile: acciones se apilan o flexionan sin perder prioridad.

---

## 9. Componentes base

### 9.1 Buttons

Variantes canónicas:

- `primary`: avanzar/cambiar estado;
- `secondary`: acción neutra o navegación;
- `ghost`: acción contextual de baja prioridad;
- `danger`: acción destructiva o rechazo real;
- `icon`: sólo cuando el significado es inequívoco.

Reglas:

- altura estándar `40–42px`;
- táctil mobile mínimo `44px`;
- verbo específico: `Registrar recepción`, `Aprobar liquidación`, `Asignar fuente`;
- un solo primary por bloque de decisión;
- acciones destructivas nunca compiten visualmente con la acción positiva antes de que exista una decisión.

### 9.2 Inputs

- fondo `--surface`;
- borde `--line`;
- radio `7px`;
- focus visible mediante `--ocean` o `--teal`;
- label siempre visible cuando el campo no sea búsqueda;
- placeholder no sustituye label;
- error se muestra cerca del campo y explica cómo corregirlo.

### 9.3 Panels

Un panel estándar:

- fondo `--surface`;
- borde `1px solid --line`;
- radio `8–10px`;
- padding `20–24px` desktop, `16px` mobile;
- sin sombra.

No crear panel si sólo existe un título y dos líneas de texto.

### 9.4 KPI / metric

- máximo 3–5 métricas dominantes por bloque;
- valor primero, label después;
- unidad visible;
- variación sólo cuando existe referencia temporal o objetivo real;
- color semántico sólo si hay decisión asociada;
- métricas históricas deben leerse como contexto, no competir con trabajo vivo.

### 9.5 Badges / status

Estados base:

- `success`;
- `warning`;
- `danger`;
- `info`;
- `neutral`.

Badge = estado corto. No meter frases completas dentro de un badge.

### 9.6 Icons

- iconos lineales, sobrios y de una misma familia;
- `16–20px` en UI normal;
- `20–24px` en empty states;
- no usar iconos como decoración sin significado;
- no usar emojis;
- iconos sin texto requieren `aria-label`.

---

## 10. Tablas, ledgers y listas operacionales

Pescamar es un sistema de operación; las tablas son una superficie primaria, no contenido secundario.

### Tabla desktop

- encabezado sticky cuando la tabla supera el viewport;
- labels a izquierda;
- números a derecha;
- unidades junto al valor;
- filas `44–52px` según densidad;
- hover sutil;
- acciones a la derecha;
- columnas críticas visibles sin scroll horizontal en desktop normal.

### Densidad

- **Comfortable:** dashboards, partner views, gerencia.
- **Operational:** recepciones, inventario, producción.
- **Dense:** auditoría y evidencia técnica; nunca sacrificar legibilidad.

### Mobile

No encoger una tabla de 10 columnas.

Elegir uno:

- ocultar columnas no críticas;
- convertir fila en bloque vertical;
- permitir scroll horizontal sólo cuando comparar columnas sea la tarea principal;
- ofrecer drawer de detalle.

### Listas de trabajo

Colas, alertas y decisiones deben leerse como filas, no como muros de cards.

- usar divisores;
- altura mínima `56–64px`;
- prioridad visual discreta;
- acción o destino claro;
- toda la fila puede ser interactiva cuando representa un objeto único.

---

## 11. Forms y flujos de captura

Los formularios críticos se dividen por lógica operacional, no por estética.

### Estructura

1. identificación del objeto;
2. datos obligatorios;
3. evidencia;
4. decisión/resultado;
5. acción final.

### Reglas

- campos relacionados en `2 columnas` sólo cuando exista ancho suficiente;
- máximo `720–840px` para formularios lineales;
- formularios complejos pueden usar grid, pero deben mantener un orden de tabulación lógico;
- acciones finales siempre visibles al cierre del formulario;
- no limpiar valores válidos tras errores parciales;
- confirmar acciones destructivas o irreversibles proporcionalmente al riesgo.

---

## 12. Modals, drawers y detalle contextual

### Modal

Usar sólo para:

- creación/edición breve;
- confirmación;
- selección contextual.

No usar modal para procesos largos, dashboards ni trabajo que requiera comparar información externa.

### Drawer

El drawer es el patrón preferido para **detalle profundo de un objeto** sin perder el contexto de la lista.

Ejemplos:

- `LiveLotDrawer`;
- historial de lote;
- evidencia de recepción.

Reglas:

- header sticky;
- objeto y estado visibles arriba;
- secciones separadas por divisores, no por múltiples cards;
- acciones críticas consistentes mediante `LiveLotActionRail` o equivalente;
- ancho suficiente para lectura y formularios, sin cubrir innecesariamente todo el workspace.

---

## 13. Estados del sistema

Toda superficie de datos debe tener diseñados explícitamente:

1. `loading`;
2. `ready`;
3. `empty`;
4. `degraded`;
5. `error`;
6. `permission denied`, cuando aplique.

### Loading

- preservar estructura para evitar layout shift;
- no mostrar spinners gigantes como contenido principal;
- loading local para acciones locales.

### Empty

Componente único con:

- icono;
- título máximo 5 palabras;
- explicación de una línea;
- acción concreta cuando exista.

### Degraded

Debe explicar:

- qué fuente falló;
- qué información sigue siendo válida;
- qué parte está temporalmente incompleta;
- si el usuario puede continuar operando.

Nunca reemplazar datos válidos por mocks o fallback visual más amplio.

### Error

- mensaje específico;
- conservar estado seguro;
- ofrecer reintento cuando tenga sentido;
- no convertir error técnico en alerta de negocio.

---

## 14. Patrones por tipo de pantalla

### Dashboard / Hoy

Objetivo: **decidir qué atender primero**.

- una respuesta dominante / command deck;
- máximo 3–5 métricas ejecutivas;
- cola de excepciones priorizada;
- actividad normal en segundo plano;
- salud técnica sólo cuando afecte operación o cuando el usuario entra a Observabilidad.

### Recepciones

Objetivo: **capturar y validar el ingreso real**.

- lista operativa primero;
- CTA `Nueva recepción` inequívoco;
- evidencia/documentos accesibles desde el objeto;
- calidad/producción continúan desde el mismo lote, no como duplicación de captura.

### Producción / Planning

Objetivo: **llevar lote → proceso → salida**.

- trabajo actual antes que análisis;
- contexto de lote/planta visible;
- rendimiento, merma y balance de masa cerca del objeto;
- histórico y benchmark en segundo nivel.

### Floor Station / Packing

Objetivo: **operar rápido en ambiente industrial**.

Modo táctil:

- targets `48px+`;
- alto contraste;
- lote, estación y operador siempre visibles;
- acciones primarias grandes;
- feedback inmediato de scanner, peso, etiqueta y estado offline;
- mínima navegación lateral;
- no depender de hover.

### Inventario

Objetivo: **saber qué hay, dónde está y qué se puede mover**.

- ubicaciones y disponibilidad dominan;
- totales son contexto;
- hold, reservado y comprometido deben ser distinguibles sin depender sólo de color;
- movimientos auditables desde el objeto.

### Ficha 360 / Lot 360

Objetivo: **entender un lote completo sin reconstruirlo manualmente**.

- identidad + estado arriba;
- timeline y continuidad como eje;
- calidad, producción, inventario, comercial, costos y evidencia conectados al mismo `reception_id`/lote;
- evitar mini dashboards desconectados dentro de la ficha.

### Comercial / Despachos

Objetivo: **comprometer y despachar sin sobrepromesa**.

- disponibilidad real visible antes de reservar;
- estados bloqueados explican la causa;
- acciones comerciales distinguen planificado, reservado, despachado y vendido.

### Finanzas / Liquidaciones / Créditos

Objetivo: **tomar decisiones financieras auditables**.

- layout tipo ledger;
- montos alineados y comparables;
- CLP/USD visibles;
- aprobaciones separadas de evidencia;
- rechazo o reversión requieren comentario cuando el negocio lo exige;
- no usar cards decorativas para cada monto.

### Auditoría / Observabilidad

Objetivo: **investigar**.

- densidad alta pero legible;
- filtros compactos;
- timestamps, actor, planta, módulo y resultado visibles;
- técnica y negocio claramente separados.

### Rollout

Objetivo: **convertir bloqueadores en acciones**.

- no crear otro wizard;
- cada bloqueo debe llevar al módulo que lo resuelve;
- distinguir UAT técnico, continuidad y aceptación LIVE humana;
- una planta nunca aparece LIVE sólo por score visual.

---

## 15. Navegación e información

La navegación debe reflejar tareas, no arquitectura técnica.

### Orden recomendado de dominios

1. Hoy / Dashboard.
2. Recepciones.
3. Producción / Planificación.
4. Floor / Packing.
5. Inventario / Frío.
6. Comercial / Despachos.
7. Finanzas.
8. Trazabilidad / Timeline / Ficha 360.
9. Observabilidad / Auditoría.
10. Administración / configuración.

La disponibilidad exacta depende del rol.

### Reglas

- no más de 7–9 destinos principales visibles simultáneamente;
- agrupar módulos secundarios bajo una jerarquía clara;
- no perder navegación al entrar a vistas profundas;
- mantener contexto de planta cuando el flujo lo necesita;
- evitar múltiples navbars o tabs que compitan por la misma profundidad.

---

## 16. Responsive

Breakpoints de referencia:

- `>1180px`: desktop amplio.
- `901–1180px`: desktop compacto.
- `621–900px`: tablet / mobile landscape.
- `<=620px`: mobile.

### Reglas universales

- cero scroll horizontal accidental en `360px`;
- targets táctiles `44×44px` mínimo;
- CTA principal nunca desaparece;
- el orden del DOM mantiene lógica de lectura;
- grids de 3 columnas pasan a 2 y luego a 1;
- barras de KPI pueden transformarse en scroll controlado sólo si conservan comprensión;
- sidebars, drawers y tablas se recomponen; no se escalan proporcionalmente.

---

## 17. Motion

Movimiento sólo para explicar cambio de estado.

Permitido:

- `120–180ms` hover/focus;
- `180–240ms` drawer/modal;
- skeleton/loading discreto;
- expansión/colapso funcional.

Prohibido:

- parallax;
- floats continuos;
- contadores animados innecesarios;
- hover con desplazamientos grandes;
- animaciones que retrasen una acción operacional.

Siempre respetar `prefers-reduced-motion`.

---

## 18. Accesibilidad

- HTML semántico antes que `div` interactivo.
- Foco visible mínimo `3:1`.
- Navegación completa con teclado en escritorio.
- Color nunca es la única señal.
- Inputs con label real.
- Icon buttons con `aria-label`.
- Mensajes críticos dinámicos con `aria-live` o `role="alert"`.
- Modals retienen foco y lo devuelven al origen.
- Tablas usan encabezados semánticos.
- `prefers-reduced-motion` obligatorio.
- Texto normal debe cumplir WCAG AA.

---

## 19. Voz y contenido

### Tono

- Español de Chile.
- Directo.
- Profesional.
- Operacional.
- Específico.

### Reglas

- verbos activos;
- frases breves;
- evitar jerga técnica cuando no ayuda a decidir;
- no decir `IA` si puede describirse la acción concreta;
- distinguir configuración, dato pendiente, alerta de negocio y error técnico;
- no usar copy alarmista para estados neutros.

### Ejemplos

Sí:

- `Asigna una fuente validada para comenzar a publicar indicadores.`
- `Falta evidencia de calidad para continuar este lote.`
- `La analítica está temporalmente degradada. El estado de planta sigue disponible.`

No:

- `Los indicadores se encuentran bloqueados debido a la inexistencia de una fuente operacional.`
- `Error inesperado.`
- `Powered by AI` como explicación funcional.

---

## 20. Anti-patrones prohibidos

Se consideran deuda visual prioritaria:

- card dentro de card sin función;
- doble frame;
- headers repetidos;
- múltiples CTAs primarios;
- pills excesivos;
- bordes en cada elemento;
- sombras para separar estructura normal;
- gradientes decorativos;
- fondos semánticos saturados;
- tablas convertidas en cards sin necesidad;
- texto operativo menor a `12px`;
- iconos de familias distintas;
- información duplicada entre sidebar, topbar y header;
- empty state repetido en varios paneles;
- métricas sin fuente real;
- estados `healthy` inferidos sólo por apariencia;
- módulos restringidos visibles pero inutilizables sin explicación;
- mobile resuelto sólo con `font-size` menor;
- colores hex nuevos dentro de componentes;
- estilos inline para resolver reglas reutilizables.

---

## 21. Contrato de implementación CSS / componentes

### Prioridad de estilos

La arquitectura debe converger hacia:

1. tokens globales;
2. primitives/base UI;
3. shell/layout;
4. componentes compartidos;
5. estilos específicos de módulo;
6. excepciones justificadas.

`premium.css` y `frida.css` representan actualmente buena parte del lenguaje canónico; deben consolidarse progresivamente y no convertirse en capas contradictorias infinitas.

### Reglas de código

- token nuevo → primero en sistema global;
- patrón repetido → componente compartido;
- selector `!important` nuevo requiere justificación y debe reducirse durante consolidación;
- no duplicar una misma regla visual en múltiples archivos de módulo;
- preferir nombres semánticos sobre nombres ligados a colores;
- no cambiar lógica operacional durante un refactor puramente visual;
- toda superficie nueva debe soportar light + dark desde el inicio.

### Componentes compartidos objetivo

- `PageHeader`;
- `Button` variants;
- `StatusBadge`;
- `Panel`;
- `Metric`;
- `EmptyState`;
- `ErrorState`;
- `DataTable` / responsive row;
- `FormField`;
- `Modal`;
- `Drawer`;
- `SectionHeader`;
- `OperationalStrip`;
- `PlantScope`;
- `LotContextBar`;
- `ActionRail`.

No es obligatorio migrar todo de una vez; sí es obligatorio no seguir ampliando patrones duplicados.

---

## 22. QA visual obligatorio

Una interfaz no está terminada porque compile.

Antes de merge:

- [ ] La tarea principal se entiende en menos de 10 segundos.
- [ ] No existen doble frames ni cards innecesarias.
- [ ] No hay estados/mensajes duplicados.
- [ ] Sólo se muestran datos reales o vacíos honestos.
- [ ] Existe una sola acción primaria por decisión.
- [ ] Light y dark conservan jerarquía y contraste.
- [ ] Desktop amplio validado.
- [ ] Desktop compacto/tablet validado.
- [ ] `360px` validado.
- [ ] Sin overflow horizontal accidental.
- [ ] Hover, focus, active y disabled resueltos.
- [ ] Loading, empty, degraded y error resueltos.
- [ ] Navegación por rol no expone superficies indebidas.
- [ ] Keyboard/focus revisados en flujos críticos.
- [ ] Console/runtime sin errores nuevos.
- [ ] ESLint, TypeScript, build y pruebas aplicables pasan.
- [ ] Preview Vercel revisado visualmente antes de declarar el cambio terminado.

### Release gate visual

- **P0:** bloquea uso, accesibilidad crítica o puede inducir una acción errónea.
- **P1:** rompe navegación, consistencia, jerarquía o una tarea principal.
- **P2:** reduce claridad, densidad o calidad premium.
- **P3:** refinamiento.

P0/P1 visuales bloquean merge.

---

## 23. Gobernanza

- Este documento es canónico.
- Toda excepción debe documentarse en el PR.
- Toda nueva regla reusable debe incorporarse aquí antes o junto con su implementación.
- Los tokens nuevos deben existir en light y dark.
- Las capturas se usan como evidencia de QA, no como fuente de verdad superior a `DESIGN.md`.
- Una regresión de contraste, navegación, doble frame, responsive o estado engañoso bloquea release.
- El sistema debe evolucionar por consolidación, no acumulando capas CSS ad hoc.

### Principio final

> **Si una pantalla necesita más decoración para sentirse clara, primero revisar su jerarquía, densidad y arquitectura.**

Pescamar debe ser reconocible por su calma, precisión, lenguaje marítimo y calidad operacional incluso sin mostrar el logo.
