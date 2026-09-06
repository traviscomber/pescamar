import {Bot,BriefcaseBusiness,CheckCircle2,CircleAlert,Cog,Factory,PackageCheck,Ship,ShoppingCart,Snowflake,Target,TrendingUp,UsersRound} from 'lucide-react'
import {PageHeader} from '../components/PageHeader'
import '../operating-model.css'

type Tone='system'|'operator'|'commercial'|'manager'|'support'
type Task={tone:Tone;text:string;icon?:'check'|'alert'|'gear'}
type Stage={step:string;title:string;description:string;icon:typeof Ship;tasks:Partial<Record<Tone,Task>>}
type WorkflowFact={stage:string;state:'ready'|'partial';automated:string;human:string;next:string}

const roles:{key:Tone;title:string;subtitle:string;icon:typeof Bot}[]=[
 {key:'system',title:'Sistema / automatización',subtitle:'Datos, reglas y contexto',icon:Bot},
 {key:'operator',title:'Operador generalista',subtitle:'Ejecución en planta',icon:Factory},
 {key:'commercial',title:'Responsable comercial / administrativo',subtitle:'Órdenes y clientes',icon:BriefcaseBusiness},
 {key:'manager',title:'Gerente / supervisor',subtitle:'Excepciones y resultados',icon:UsersRound},
 {key:'support',title:'Administración técnica',subtitle:'Soporte esporádico',icon:Cog},
]

const stages:Stage[]=[
 {step:'01',title:'Recepción',description:'Ingreso de materia prima y registro inicial.',icon:Ship,tasks:{system:{tone:'system',text:'Prellena proveedor, lote y contexto'},operator:{tone:'operator',text:'Confirma evidencia y mediciones físicas',icon:'check'},manager:{tone:'manager',text:'Sólo si hay bloqueo',icon:'alert'}}},
 {step:'02',title:'Producción',description:'Proceso y transformación del producto.',icon:Factory,tasks:{system:{tone:'system',text:'Mantiene trazabilidad y secuencia'},operator:{tone:'operator',text:'Confirma proceso y rendimiento',icon:'check'},manager:{tone:'manager',text:'Interviene ante excepción P1',icon:'alert'}}},
 {step:'03',title:'Packing',description:'Acondicionamiento, etiquetado y preparación.',icon:PackageCheck,tasks:{system:{tone:'system',text:'Sugiere etiqueta y destino'},operator:{tone:'operator',text:'Confirma caja, lote y packing',icon:'check'}}},
 {step:'04',title:'Inventario y frío',description:'Control de stock, trazabilidad y cadena de frío.',icon:Snowflake,tasks:{system:{tone:'system',text:'Actualiza stock y cadena de frío'},operator:{tone:'operator',text:'Confirma movimientos críticos',icon:'check'}}},
 {step:'05',title:'Comercial y despacho',description:'Órdenes, clientes, despachos y liquidación.',icon:ShoppingCart,tasks:{system:{tone:'system',text:'Arrastra contexto de lote y stock'},commercial:{tone:'commercial',text:'Gestiona órdenes, guías, despacho y liquidación',icon:'check'},manager:{tone:'manager',text:'Aprueba sólo decisiones materiales',icon:'alert'}}},
 {step:'06',title:'Decisión y mejora',description:'Análisis, excepciones y mejora continua.',icon:TrendingUp,tasks:{system:{tone:'system',text:'Prioriza P1 / P2 / P3'},manager:{tone:'manager',text:'Decide con evidencia',icon:'check'},support:{tone:'support',text:'Soporte, usuarios, integraciones y auditoría',icon:'gear'}}},
]

const workflowFacts:WorkflowFact[]=[
 {stage:'Recepción',state:'ready',automated:'Planta por alcance, fecha/hora y propuesta de proveedor, guía, zona, especie y peso declarado desde evidencia; aceptado, merma y diferencia se calculan.',human:'Revisar el contexto documental sólo si existe diferencia y registrar bruto, tara, escurrido y temperatura observados.',next:'Mantener toda corrección administrativa detrás del flujo de excepción y nunca promover mediciones físicas desde Vision.'},
 {stage:'Producción',state:'ready',automated:'Planning calcula la siguiente prioridad usando órdenes, lotes y disponibilidad.',human:'Ejecutar físicamente el proceso y confirmar el rendimiento observado.',next:'El plan completo sólo reaparece ante bloqueo o excepción.'},
 {stage:'Packing',state:'ready',automated:'Scan identifica lote; planta y estación se heredan; escritura es idempotente y tolera offline.',human:'Escanear el lote y confirmar el peso físico del packing.',next:'Mantener Planta, Lote y Estación sólo como corrección manual, no como pasos normales.'},
 {stage:'Inventario',state:'ready',automated:'Disponibilidad, bloqueos y kilos sin ubicación se calculan desde estado operacional.',human:'Intervenir sólo para resolver bloqueo o una ubicación física faltante.',next:'Mantener inventario como consecuencia del flujo, nunca como segunda digitación.'},
 {stage:'Cadena de frío',state:'ready',automated:'Ciclos, desviaciones y trazabilidad quedan en el sistema; existe ingesta machine-to-machine fail-closed cuando se conecte telemetría real.',human:'Medir y registrar temperatura sólo cuando no exista sensor activo, y revisar cualquier desviación antes de liberar producto.',next:'La lectura manual es una captura física válida, no deuda administrativa. Conectar sensor/gateway reduce carga, pero no bloquea el flujo mínimo.'},
 {stage:'Comercial',state:'ready',automated:'El sistema propone lote y máximo reservable, mantiene disponibilidad y hereda despacho, cliente y kilos hacia la venta cuando existe evidencia confirmada.',human:'Confirmar la reserva, el precio/documento de venta y las decisiones financieras materiales.',next:'No eliminar estas confirmaciones: son compromisos económicos deliberados; evitar cualquier segunda digitación alrededor de ellas.'},
]

const legend=[
 {tone:'system' as Tone,label:'Automatiza / prepara',note:'El sistema hace lo repetitivo'},
 {tone:'operator' as Tone,label:'Confirma / ejecuta',note:'La persona realiza y valida'},
 {tone:'manager' as Tone,label:'Aprueba / decide',note:'Sólo excepciones o decisiones clave'},
 {tone:'support' as Tone,label:'Soporte esporádico',note:'Tareas no diarias'},
]

function TaskIcon({icon}:{icon?:Task['icon']}){
 if(icon==='check')return <CheckCircle2 size={17}/>
 if(icon==='alert')return <CircleAlert size={17}/>
 if(icon==='gear')return <Cog size={17}/>
 return <Bot size={17}/>
}

export function OperatingModel(){
 return <div className="operating-model-page">
  <PageHeader eyebrow="Administración" title="Tareas y responsables" description="Modelo operativo mínimo: automatizar lo repetitivo, confirmar sólo lo físico y escalar únicamente excepciones."/>
  <section className="operating-objective" aria-label="Objetivo operativo">
   <Target size={20}/><p><strong>Objetivo:</strong> que la operación diaria funcione con <b>2–3 usuarios activos</b> y que el sistema absorba todo lo repetitivo.</p>
  </section>

  <section className="operating-matrix" aria-label="Matriz de tareas y responsables">
   <div className="operating-matrix-head stage-head"><span>Etapa del proceso</span></div>
   {roles.map(({key,title,subtitle,icon:Icon})=><div className={`operating-matrix-head role-head tone-${key}`} key={key}><Icon size={19}/><div><b>{title}</b><small>{subtitle}</small></div></div>)}
   {stages.map(stage=><div className="operating-row" key={stage.step}>
    <div className="stage-cell">
     <span className="stage-number">{stage.step}</span><stage.icon size={22}/><div><b>{stage.title}</b><small>{stage.description}</small></div>
    </div>
    {roles.map(role=>{const task=stage.tasks[role.key];return <div className="task-cell" key={`${stage.step}-${role.key}`}>{task?<div className={`task-pill tone-${task.tone}`}><TaskIcon icon={task.icon}/><span>{task.text}</span></div>:<span className="task-empty" aria-label="Sin tarea directa">—</span>}</div>})}
   </div>)}
  </section>

  <section className="operating-legend" aria-label="Leyenda de responsabilidades">
   {legend.map(item=><div key={item.tone}><span className={`legend-dot tone-${item.tone}`}/><p><b>{item.label}</b><small>{item.note}</small></p></div>)}
  </section>

  <section className="workflow-audit" aria-label="Auditoría de automatización del flujo">
   <header><div><span className="overline teal">Seafood Chile Core</span><h2>Qué debe tocar una persona</h2><p>Estado observado en el flujo actual. Un dato heredable o calculable no debe convertirse en una nueva tarea humana.</p></div></header>
   <div className="workflow-audit-grid">
    {workflowFacts.map(item=><article className="workflow-audit-row" key={item.stage}>
     <div className="workflow-audit-stage"><b>{item.stage}</b><span className={`workflow-state ${item.state}`}>{item.state==='ready'?'Flujo mínimo':'Reducible'}</span></div>
     <div><small>Sistema</small><p>{item.automated}</p></div>
     <div><small>Persona</small><p>{item.human}</p></div>
     <div><small>Siguiente eliminación</small><p>{item.next}</p></div>
    </article>)}
   </div>
  </section>

  <section className="operating-summary">
   <div className="operating-principle"><Target size={20}/><div><span>Principio operativo</span><strong>Capturar una vez → confirmar lo físico → automatizar lo repetitivo → escalar sólo excepciones → decidir con evidencia.</strong></div></div>
   <div className="operating-staff"><UsersRound size={20}/><div><span>Dotación objetivo</span><ul><li>1 operador generalista de planta</li><li>1 responsable comercial / administrativo</li><li>1 gerente / supervisor por excepción</li><li>Administración técnica: soporte no diario</li></ul></div></div>
  </section>
 </div>
}