# Pescamar ERP — sistema de diseño

Este documento es la fuente de verdad visual y de experiencia para Pescamar ERP. Toda pantalla nueva y toda modificación deben cumplirlo antes de llegar a producción.

## 1. Propósito

Pescamar ERP convierte una operación pesquera compleja en decisiones simples para un equipo pequeño. La interfaz debe permitir que cinco personas entiendan el estado de la empresa, revisen excepciones y aprueben o rechacen acciones sin recorrer información innecesaria.

La promesa de diseño es: **operación compleja, control sereno**.

## 2. Principios obligatorios

1. **Una tarea principal por pantalla.** El título, el contenido dominante y la acción primaria deben responder al mismo objetivo.
2. **Control por excepción.** Mostrar primero lo que requiere criterio humano; el sistema normal permanece silencioso.
3. **Datos reales o vacío honesto.** Nunca inventar KPI, estados, actividad, operadores ni tendencias.
4. **Divulgación progresiva.** Resumen primero; detalle al seleccionar, expandir o navegar.
5. **Una sola expresión por estado.** No repetir “sin fuente”, “bloqueado” y “sin datos” en varios paneles de la misma vista.
6. **Color con significado.** El color no decora: comunica estado, riesgo o acción.
7. **Contraste verificable.** Ningún texto puede depender de una combinación de colores accidental entre temas.
8. **Corporativo por defecto.** La red se resume; la operación se ejecuta dentro de una planta seleccionada.

## 3. Identidad visual

El producto combina la identidad marítima de Pescamar con el lenguaje técnico y sobrio de N3uralia.

### Tipografía

- **Montserrat:** cuerpo, navegación, formularios, tablas y texto explicativo.
- **Rajdhani:** títulos, cifras, overlines, estados breves y botones.
- No usar Rajdhani para párrafos largos ni Montserrat para títulos editoriales principales.
- Evitar tamaños inferiores a `12px` en información operativa. `10–11px` se reserva para metadatos secundarios.

### Paleta semántica

| Token | Tema oscuro | Tema claro | Uso |
|---|---:|---:|---|
| `--page` | `#071018` | `#f3f6f7` | Fondo de aplicación |
| `--surface` | `#0c1720` | `#ffffff` | Panel principal |
| `--surface-2` | `#111e27` | `#f5f8fa` | Superficie secundaria |
| `--text` | `#e8f1f4` | `#102532` | Texto principal |
| `--muted` | `#93a6af` | `#687c86` | Texto secundario |
| `--line` | `#253944` | `#d5dfe3` | Bordes y divisores |
| `--ocean` | `#356b8d` | `#0e4370` | Identidad Pescamar y selección |
| `--teal` | `#739694` | `#567f7d` | Acción y confirmación sobria |
| `--success` | `#62b690` | `#247452` | Operación correcta |
| `--warning` | `#d7ad67` | `#94631f` | Atención real |
| `--danger` | `#e58f86` | `#aa3f35` | Riesgo o rechazo |

Reglas:

- Naranja no pertenece a la navegación, selección, tarjetas ni métricas normales.
- `warning` solo aparece cuando existe una condición real que requiere atención.
- Un estado pendiente de configuración es neutro, no una alerta.
- No aplicar clases semánticas globales como `.attention` para pintar contenedores completos.
- El texto y los iconos deben mantener contraste WCAG AA: `4.5:1` para texto normal y `3:1` para texto grande o componentes.

## 4. Espaciado y geometría

Usar una escala única: `4, 8, 12, 16, 24, 32, 48, 64px`.

- Contenido de página: máximo `1480px`.
- Separación entre encabezado y contenido: `24–32px`.
- Separación entre secciones: `24px` como mínimo.
- Padding de panel: `20–24px` en escritorio y `16–20px` en móvil.
- Bordes: `1px`, fríos y discretos.
- Radio: `0–8px`; evitar tarjetas excesivamente redondeadas.
- Sombras: solo para elevación interactiva o modales. No usar sombras para separar cada panel.

El espacio negativo debe crear jerarquía. No agregar tarjetas para llenar zonas vacías.

## 5. Jerarquía de una pantalla

Orden recomendado:

1. Contexto del módulo.
2. Título y explicación de una línea.
3. Una acción primaria, si corresponde.
4. Resumen o estado dominante.
5. Contenido operativo.
6. Evidencia y detalle secundario.

No duplicar en la misma vista el nombre del módulo, breadcrumb, selector y enlace de regreso si expresan el mismo contexto. El selector de planta aparece en el encabezado o en una barra de alcance compacta, nunca como un formulario de ancho completo aislado.

## 6. Componentes

### Encabezado de página

- Overline opcional, título, descripción breve y máximo dos acciones.
- Solo una acción puede ser primaria.
- El título describe el objeto o la tarea, no el software.

### Tarjetas de planta

- Toda la tarjeta es seleccionable.
- Mostrar nombre, ubicación, modalidad, productos y estado esencial.
- Una planta sin fuente usa un icono neutro con etiqueta accesible y una sola leyenda textual: `No vinculada`.
- No mostrar bloques repetidos de “Fuente pendiente” o “Sin indicadores publicados”.
- Los KPI aparecen únicamente cuando existe una fuente validada.

### Estados vacíos

Un estado vacío es un único componente compuesto por:

- icono;
- título de máximo cinco palabras;
- explicación de una línea;
- una acción concreta.

No dividir el mismo vacío entre banner, catálogo, alerta y panel bloqueado.

### Estados de carga y error

- La carga preserva la estructura para evitar saltos de layout.
- El error explica qué falló, qué datos permanecen seguros y cómo reintentar.
- Nunca usar blanco fijo dentro del tema oscuro ni negro fijo dentro del tema claro.

### Botones

- Primario: acción que cambia el estado o avanza el proceso.
- Secundario: navegación o consulta.
- Peligro: rechazo, reversión o eliminación; siempre con confirmación proporcional.
- Etiquetas con verbo: `Asignar fuente`, `Revisar recepción`, `Aprobar crédito`.
- Iconos acompañan el texto; no sustituyen acciones ambiguas.

### Tablas y datos

- Alinear números a la derecha y etiquetas a la izquierda.
- Mostrar unidad junto al valor.
- Mantener encabezado visible en tablas largas.
- En móvil, priorizar columnas o convertir filas en bloques; no reducir la tipografía hasta volverla ilegible.

## 7. Patrón obligatorio: detalle de planta sin fuente

La ruta `/plantas/:id` sin datos publicados debe tener esta estructura:

1. Barra compacta de alcance para cambiar de planta.
2. Encabezado con nombre, ubicación y acción `Asignar fuente`.
3. Un único estado vacío central: `Planta sin fuente operacional`.
4. Catálogo de productos como detalle secundario colapsable o debajo del vacío.

Debe eliminarse:

- el banner blanco de “Sin fuente asignada”;
- el panel separado de “Indicadores bloqueados”;
- la repetición de “configurada”, “sin fuente”, “sin indicadores” y “bloqueados”;
- cualquier texto con contraste insuficiente;
- el gran selector horizontal que compite con el título.

Mientras no haya fuente, no existe justificación para reservar espacios de KPI.

## 8. Modo oscuro y modo claro

- Los componentes consumen tokens; no colores hexadecimales directos.
- Cada superficie debe probarse en ambos temas.
- Los estados semánticos cambian fondo, texto y borde como conjunto.
- Ningún componente puede usar `background: #fff` sin una variante explícita de tema.
- Gráficos, focus, hover, disabled, error y campos autocompletados también deben verificarse en ambos temas.

## 9. Responsive

Breakpoints de referencia:

- `>1180px`: escritorio amplio, tres columnas cuando el contenido lo permite.
- `721–1180px`: escritorio compacto o tablet, una o dos columnas.
- `<=720px`: navegación móvil, una columna y acciones de ancho completo cuando sea necesario.

Requisitos:

- Sin scroll horizontal en `360px`.
- Objetivos táctiles mínimos de `44×44px`.
- No ocultar la acción principal.
- El orden de lectura debe permanecer lógico sin depender de la posición visual.

## 10. Accesibilidad

- HTML semántico antes que `div` interactivos.
- Foco visible con contraste mínimo `3:1`.
- Navegación completa con teclado.
- Iconos sin texto requieren `aria-label` o texto visualmente oculto.
- El color nunca es la única señal de estado.
- Respetar `prefers-reduced-motion`.
- Mensajes dinámicos importantes usan `aria-live` o `role="alert"` según corresponda.

## 11. Voz y contenido

- Español de Chile, directo y profesional.
- Frases breves y verbos activos.
- Evitar jerga técnica cuando no ayuda a decidir.
- No decir “IA” si la acción puede describirse de forma concreta.
- Diferenciar claramente configuración, dato pendiente, alerta operacional y error del sistema.

Ejemplos:

- Sí: `Asigna una fuente validada para comenzar a publicar indicadores.`
- No: `Los indicadores se encuentran bloqueados debido a la inexistencia de una fuente operacional.`

## 12. Criterios de aceptación visual

Una interfaz no está terminada solo porque compila. Antes de fusionar:

- [ ] La tarea principal se entiende en menos de diez segundos.
- [ ] No existen estados o mensajes duplicados.
- [ ] Solo se muestran datos reales.
- [ ] Tema oscuro y claro mantienen jerarquía y contraste WCAG AA.
- [ ] Se revisó en escritorio y en `360px`.
- [ ] No hay desbordes, cortes ni saltos de layout.
- [ ] Hover, foco, teclado, carga, vacío y error están resueltos.
- [ ] La acción primaria es inequívoca.
- [ ] ESLint, TypeScript y build de producción pasan.
- [ ] Se realizó una verificación visual sobre la interfaz desplegada.

## 13. Gobernanza

- Este archivo prevalece sobre estilos ad hoc y capturas antiguas.
- Toda excepción debe documentar la razón en el PR.
- Los patrones repetidos deben convertirse en componentes compartidos.
- Los colores, tamaños y espaciados nuevos deben incorporarse primero como tokens.
- Una regresión de contraste, duplicación o responsive bloquea el merge.

