export type OsModule={path:string;label:string;description:string;technicalIdentity?:string}
export type OsStage={id:string;order:number;label:string;owner:string;description:string;entry:string;modules:readonly OsModule[]}

export const osStages:readonly OsStage[]=[
 {id:'intake',order:1,label:'Recepción',owner:'Recepción y abastecimiento',description:'Origen, pesaje, evidencia y nacimiento del lote.',entry:'/recepciones',modules:[
  {path:'/recepciones',label:'Recepciones',description:'Captura y evidencia de origen'},
  {path:'/proveedores-clientes',label:'Proveedores y clientes',description:'Contrapartes y desempeño'},
  {path:'/creditos',label:'Créditos y anticipos',description:'Financiamiento de abastecimiento'},
 ]},
 {id:'production',order:2,label:'Producción',owner:'Jefatura de planta',description:'Plan, transformación, rendimiento y empaque.',entry:'/planificacion',modules:[
  {path:'/planificacion',label:'Planificación',description:'Carga y prioridades de proceso'},
  {path:'/lineas',label:'Producción',description:'Ejecución y balance de masa'},
  {path:'/proceso-erizo',label:'Proceso de erizo',description:'Flujo especializado cuando el producto lo requiere'},
  {path:'/floor',label:'Packing',description:'Pesaje y registro de cajas en estación'},
  {path:'/etiquetas',label:'Control de etiquetas',description:'Identidad y estado del producto'},
  {path:'/impresion-etiquetas',label:'Impresión de etiquetas',description:'Cola y control de impresión'},
  {path:'/pallets',label:'Pallets',description:'Consolidación física de producto terminado'},
 ]},
 {id:'quality',order:3,label:'Calidad y cumplimiento',owner:'Encargado de calidad',description:'Liberación, inocuidad, temperatura y evidencia.',entry:'/control-regulatorio',modules:[
  {path:'/uni',label:'Revisión visual (Uni)',description:'Captura visual y revisión humana del producto',technicalIdentity:'EdgeVision · Uni Vision'},
  {path:'/control-regulatorio',label:'Control regulatorio',description:'Bloqueos, liberaciones y evidencia'},
  {path:'/frio',label:'Cadena de frío',description:'Temperatura y continuidad'},
  {path:'/observabilidad',label:'Estado técnico',description:'Salud del sistema y alertas técnicas'},
 ]},
 {id:'inventory',order:4,label:'Inventario',owner:'Bodega y despacho',description:'Posición física, FEFO, insumos y disponibilidad.',entry:'/inventario',modules:[
  {path:'/inventario',label:'Inventario',description:'Lotes y producto terminado'},
  {path:'/inventario-materiales',label:'Materias e insumos',description:'Disponibilidad operacional'},
  {path:'/plantas',label:'Plantas',description:'Control corporativo y local'},
 ]},
 {id:'commercial',order:5,label:'Comercial y finanzas',owner:'Administración y finanzas',description:'Demanda, reservas, despacho, costos y cierre económico.',entry:'/ordenes-venta',modules:[
  {path:'/ordenes-venta',label:'Órdenes de venta',description:'Demanda y asignación'},
  {path:'/despachos-ventas',label:'Despachos y ventas',description:'Salida comercial trazada'},
  {path:'/costos-transformacion',label:'Costos',description:'Costo industrial por lote'},
  {path:'/liquidaciones',label:'Liquidaciones',description:'Cierre con doble control'},
  {path:'/rentabilidad',label:'Rentabilidad',description:'Contribución y cobertura'},
 ]},
 {id:'control',order:6,label:'Inteligencia y control',owner:'Gerencia',description:'Decisiones, memoria, auditoría y configuración transversal.',entry:'/',modules:[
  {path:'/',label:'Hoy',description:'Prioridades y cierre diario'},
  {path:'/lotes',label:'Ficha 360 del lote',description:'Estado, balance, evidencia y siguiente acción'},
  {path:'/pescamar-ia',label:'Asistente Pescamar',description:'Preguntas sobre la operación con evidencia disponible'},
  {path:'/lineage',label:'Trazabilidad del lote',description:'Recorrido actual e histórico de la evidencia',technicalIdentity:'Seafood Event Graph'},
  {path:'/organization',label:'Organización',description:'Contexto de la instancia y alcance del producto'},
  {path:'/integrations',label:'Conexiones con otros sistemas',description:'Fuentes, sensores y sistemas externos conectados'},
  {path:'/aprobaciones',label:'Decisiones',description:'Excepciones que requieren una persona'},
  {path:'/timeline',label:'Historial operativo',description:'Continuidad histórica y operación actual'},
  {path:'/auditoria',label:'Auditoría operacional',description:'Actor, acción, fecha y planta'},
  {path:'/comunicaciones',label:'Comunicaciones',description:'Canales y señales operacionales'},
  {path:'/importaciones',label:'Archivos de origen',description:'Evidencia de origen e importaciones auditadas'},
  {path:'/identidades-plantas',label:'Equivalencias históricas',description:'Correspondencias para mantener continuidad'},
  {path:'/estaciones',label:'Estaciones y dispositivos',description:'Infraestructura física'},
  {path:'/operadores',label:'Operadores',description:'Responsables y alcance'},
  {path:'/rollout',label:'Puesta en marcha',description:'Preparación y validación por planta'},
  {path:'/modulos',label:'Administración',description:'Configuración y control del sistema'},
 ]},
] as const

export const osModules=osStages.flatMap(stage=>stage.modules.map(module=>({...module,stageId:stage.id,stageLabel:stage.label})))

export function getOsModule(pathname:string){return osModules.filter(module=>module.path==='/'?pathname==='/':pathname===module.path||pathname.startsWith(`${module.path}/`)).sort((a,b)=>b.path.length-a.path.length)[0]}
