export type OsModule={path:string;label:string;description:string}
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
  {path:'/proceso-erizo',label:'Proceso de erizo',description:'Flujo especializado y Vision'},
  {path:'/floor',label:'Piso / packing',description:'Captura en estación'},
  {path:'/etiquetas',label:'Etiquetas',description:'Identidad de producto'},
  {path:'/impresion-etiquetas',label:'Impresión de etiquetas',description:'Cola y control de impresión'},
  {path:'/pallets',label:'Pallets',description:'Consolidación física'},
 ]},
 {id:'quality',order:3,label:'Calidad y cumplimiento',owner:'Encargado de calidad',description:'Liberación, inocuidad, temperatura y evidencia.',entry:'/control-regulatorio',modules:[
  {path:'/control-regulatorio',label:'Control regulatorio',description:'Holds y liberaciones'},
  {path:'/frio',label:'Cadena de frío',description:'Temperatura y continuidad'},
  {path:'/observabilidad',label:'Observabilidad',description:'Salud operacional y alertas'},
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
  {path:'/pescamar-ia',label:'Pescamar IA',description:'Copiloto canónico y operacional de la implementación'},
  {path:'/aprobaciones',label:'Decisiones',description:'Excepciones que requieren persona'},
  {path:'/timeline',label:'Línea de tiempo',description:'Continuidad histórica y viva'},
  {path:'/auditoria',label:'Auditoría operacional',description:'Actor, acción, fecha y planta'},
  {path:'/comunicaciones',label:'Comunicaciones',description:'Señales y WhatsApp'},
  {path:'/importaciones',label:'Importaciones',description:'Fuentes canónicas'},
  {path:'/identidades-plantas',label:'Identidades históricas',description:'Resolución de continuidad'},
  {path:'/estaciones',label:'Estaciones y dispositivos',description:'Infraestructura física'},
  {path:'/operadores',label:'Operadores',description:'Responsables y alcance'},
  {path:'/rollout',label:'Rollout Pescamar',description:'Activación por planta de la implementación 01'},
  {path:'/modulos',label:'Seafood Intelligence OS',description:'Mapa del producto y sus sistemas'},
 ]},
] as const

export const osModules=osStages.flatMap(stage=>stage.modules.map(module=>({...module,stageId:stage.id,stageLabel:stage.label})))

export function getOsModule(pathname:string){return osModules.filter(module=>module.path==='/'?pathname==='/':pathname===module.path||pathname.startsWith(`${module.path}/`)).sort((a,b)=>b.path.length-a.path.length)[0]}
