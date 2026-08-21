# Informe Mi Toro — Pescamar Control Multiplanta

## Veredicto

**Estado:** Aprobado con observaciones

El flujo ejecutivo y el gobierno de datos son honestos para una demostración local. El producto todavía no está aprobado para piloto multiusuario porque no existe persistencia compartida, autenticación ni almacenamiento del archivo original.

## Resumen de severidad

- Críticas: 0
- Altas: 1 pendiente
- Medias: 2 pendientes
- Bajas: 1 pendiente

## Hallazgos

### MT-01 Persistencia no auditable

- **Severidad:** Alta
- **Área:** Datos / Arquitectura
- **Ruta o sección:** `/importaciones`
- **Evidencia:** snapshots e historial se guardan en `localStorage`.
- **Impacto:** dos usuarios pueden ver estados distintos y perder información al limpiar el navegador.
- **Recomendación:** persistir lotes, filas, archivo original y reversión en backend con identidad del responsable.
- **Estado:** Pendiente; la interfaz lo declara explícitamente.

### MT-02 Dos flujos de importación incompatibles

- **Severidad:** Alta
- **Área:** UX / Funcionalidad
- **Evidencia:** el tablero abría un modal de resumen mientras `/importaciones` validaba otro esquema sin publicar.
- **Impacto:** el usuario no sabía qué importador actualizaba el panel.
- **Recomendación:** mantener una única ruta de carga, validación y publicación.
- **Estado:** Corregido.

### MT-03 Controles sin función

- **Severidad:** Media
- **Área:** UX
- **Evidencia:** notificaciones y menú de usuario parecían accionables sin comportamiento asociado.
- **Impacto:** reduce confianza en la demostración.
- **Recomendación:** mostrar estado estático hasta implementar las funciones.
- **Estado:** Corregido.

### MT-04 Protección del despliegue

- **Severidad:** Media
- **Área:** Operación
- **Evidencia:** producción redirige a autenticación de Vercel.
- **Impacto:** un cliente no puede abrir la demostración sin acceso autorizado.
- **Recomendación:** definir acceso de piloto o URL compartida controlada antes de la presentación.
- **Estado:** Pendiente.

### MT-05 Documentación desactualizada

- **Severidad:** Baja
- **Área:** Producto
- **Evidencia:** README describía UniGrade y datos simulados como alcance principal.
- **Impacto:** confunde a desarrolladores y revisores.
- **Estado:** Corregido.

## Aspectos correctos

- No se muestran KPIs antes de asociar una fuente válida.
- El archivo de origen y la fecha quedan visibles.
- El lector Excel se carga bajo demanda.
- Existen estados vacío, error, validación y éxito.
- Los semáforos expresan una causa legible.

## Próximo orden de ejecución

1. Persistencia backend e identidad.
2. Archivo original y hash.
3. Reglas configurables por planta y producto.
4. Comparación temporal y métricas de uso.

## Límites de la auditoría

La producción está protegida por Vercel; la revisión visual externa no pudo atravesar esa autenticación. La validación se completó sobre código, build y estados observables disponibles.
