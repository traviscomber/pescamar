import {Bot,BriefcaseBusiness,CheckCircle2,CircleAlert,Cog,Factory,PackageCheck,Ship,ShoppingCart,Snowflake,Target,TrendingUp,UsersRound} from 'lucide-react'
import {useLocale} from '../i18n'
import {PageHeader} from '../components/PageHeader'
import '../operating-model.css'

type Tone='system'|'operator'|'commercial'|'manager'|'support'
type Task={tone:Tone;text:string;icon?:'check'|'alert'|'gear'}
type Stage={step:string;title:string;description:string;icon:typeof Ship;tasks:Partial<Record<Tone,Task>>}
type WorkflowFact={stage:string;state:'ready'|'partial';automated:string;human:string;next:string}
type Copy={header:{eyebrow:string;title:string;description:string};objective:{label:string;textStart:string;textStrong:string;textEnd:string};matrixStage:string;empty:string;roles:Array<{key:Tone;title:string;subtitle:string;icon:typeof Bot}>;stages:Stage[];legend:Array<{tone:Tone;label:string;note:string}>;audit:{aria:string;eyebrow:string;title:string;description:string;system:string;person:string;next:string;ready:string;partial:string};workflowFacts:WorkflowFact[];summary:{principleLabel:string;principle:string;staffLabel:string;staff:string[]}}

const copies:Record<'es'|'en',Copy>={
 es:{
  header:{eyebrow:'Administración',title:'Tareas y responsables',description:'Modelo operativo mínimo: automatizar lo repetitivo, confirmar sólo lo físico y escalar únicamente excepciones.'},
  objective:{label:'Objetivo:',textStart:' que la operación diaria funcione con ',textStrong:'2–3 usuarios activos',textEnd:' y que el sistema absorba todo lo repetitivo.'},
  matrixStage:'Etapa del proceso',empty:'Sin tarea directa',
  roles:[
   {key:'system',title:'Sistema / automatización',subtitle:'Datos, reglas y contexto',icon:Bot},
   {key:'operator',title:'Operador generalista',subtitle:'Ejecución en planta',icon:Factory},
   {key:'commercial',title:'Responsable comercial / administrativo',subtitle:'Órdenes y clientes',icon:BriefcaseBusiness},
   {key:'manager',title:'Gerente / supervisor',subtitle:'Excepciones y resultados',icon:UsersRound},
   {key:'support',title:'Administración técnica',subtitle:'Soporte esporádico',icon:Cog},
  ],
  stages:[
   {step:'01',title:'Recepción',description:'Ingreso de materia prima y registro inicial.',icon:Ship,tasks:{system:{tone:'system',text:'Prellena proveedor, lote y contexto'},operator:{tone:'operator',text:'Confirma evidencia y mediciones físicas',icon:'check'},manager:{tone:'manager',text:'Sólo si hay bloqueo',icon:'alert'}}},
   {step:'02',title:'Producción',description:'Proceso y transformación del producto.',icon:Factory,tasks:{system:{tone:'system',text:'Mantiene trazabilidad y secuencia'},operator:{tone:'operator',text:'Confirma proceso y rendimiento',icon:'check'},manager:{tone:'manager',text:'Interviene ante excepción P1',icon:'alert'}}},
   {step:'03',title:'Packing',description:'Acondicionamiento, etiquetado y preparación.',icon:PackageCheck,tasks:{system:{tone:'system',text:'Sugiere etiqueta y destino'},operator:{tone:'operator',text:'Confirma caja, lote y packing',icon:'check'}}},
   {step:'04',title:'Inventario y frío',description:'Control de stock, trazabilidad y cadena de frío.',icon:Snowflake,tasks:{system:{tone:'system',text:'Actualiza stock y cadena de frío'},operator:{tone:'operator',text:'Confirma movimientos críticos',icon:'check'}}},
   {step:'05',title:'Comercial y despacho',description:'Órdenes, clientes, despachos y liquidación.',icon:ShoppingCart,tasks:{system:{tone:'system',text:'Arrastra contexto de lote y stock'},commercial:{tone:'commercial',text:'Gestiona órdenes, guías, despacho y liquidación',icon:'check'},manager:{tone:'manager',text:'Aprueba sólo decisiones materiales',icon:'alert'}}},
   {step:'06',title:'Decisión y mejora',description:'Análisis, excepciones y mejora continua.',icon:TrendingUp,tasks:{system:{tone:'system',text:'Prioriza P1 / P2 / P3'},manager:{tone:'manager',text:'Decide con evidencia',icon:'check'},support:{tone:'support',text:'Soporte, usuarios, integraciones y auditoría',icon:'gear'}}},
  ],
  legend:[
   {tone:'system',label:'Automatiza / prepara',note:'El sistema hace lo repetitivo'},
   {tone:'operator',label:'Confirma / ejecuta',note:'La persona realiza y valida'},
   {tone:'manager',label:'Aprueba / decide',note:'Sólo excepciones o decisiones clave'},
   {tone:'support',label:'Soporte esporádico',note:'Tareas no diarias'},
  ],
  audit:{aria:'Auditoría de automatización del flujo',eyebrow:'Seafood Chile Core',title:'Qué debe tocar una persona',description:'Estado observado en el flujo actual. Un dato heredable o calculable no debe convertirse en una nueva tarea humana.',system:'Sistema',person:'Persona',next:'Siguiente eliminación',ready:'Flujo mínimo',partial:'Reducible'},
  workflowFacts:[
   {stage:'Recepción',state:'ready',automated:'Planta por alcance, fecha/hora y propuesta de proveedor, guía, zona, especie y peso declarado desde evidencia; aceptado, merma y diferencia se calculan.',human:'Revisar el contexto documental sólo si existe diferencia y registrar bruto, tara, escurrido y temperatura observados.',next:'Mantener toda corrección administrativa detrás del flujo de excepción y nunca promover mediciones físicas desde Vision.'},
   {stage:'Producción',state:'ready',automated:'Planificación calcula la siguiente prioridad usando órdenes, lotes y disponibilidad.',human:'Ejecutar físicamente el proceso y confirmar el rendimiento observado.',next:'El plan completo sólo reaparece ante bloqueo o excepción.'},
   {stage:'Packing',state:'ready',automated:'El escaneo identifica el lote; planta y estación se heredan; la escritura evita duplicados y tolera trabajo sin conexión.',human:'Escanear el lote y confirmar el peso físico del packing.',next:'Mantener Planta, Lote y Estación sólo como corrección manual, no como pasos normales.'},
   {stage:'Inventario',state:'ready',automated:'Disponibilidad, bloqueos y kilos sin ubicación se calculan desde el estado operacional.',human:'Intervenir sólo para resolver bloqueo o una ubicación física faltante.',next:'Mantener inventario como consecuencia del flujo, nunca como segunda digitación.'},
   {stage:'Cadena de frío',state:'ready',automated:'Ciclos, desviaciones y trazabilidad quedan en el sistema. Cuando exista telemetría real, las lecturas podrán ingresar automáticamente.',human:'Medir y registrar temperatura sólo cuando no exista sensor activo, y revisar cualquier desviación antes de liberar producto.',next:'La lectura manual sigue siendo una captura física válida. Conectar sensores reduce carga, pero no bloquea el flujo mínimo.'},
   {stage:'Comercial',state:'ready',automated:'El sistema propone lote y máximo reservable, mantiene disponibilidad y hereda despacho, cliente y kilos hacia la venta cuando existe evidencia confirmada.',human:'Confirmar la reserva, el precio o documento de venta y las decisiones financieras materiales.',next:'Mantener estas confirmaciones porque representan compromisos económicos y evitar cualquier segunda digitación alrededor de ellas.'},
  ],
  summary:{principleLabel:'Principio operativo',principle:'Capturar una vez → confirmar lo físico → automatizar lo repetitivo → escalar sólo excepciones → decidir con evidencia.',staffLabel:'Dotación objetivo',staff:['1 operador generalista de planta','1 responsable comercial / administrativo','1 gerente / supervisor por excepción','Administración técnica: soporte no diario']}
 },
 en:{
  header:{eyebrow:'Administration',title:'Tasks and ownership',description:'Minimum operating model: automate repetitive work, confirm only physical actions, and escalate exceptions.'},
  objective:{label:'Objective:',textStart:' run daily operations with ',textStrong:'2–3 active users',textEnd:' while the system absorbs repetitive work.'},
  matrixStage:'Process stage',empty:'No direct task',
  roles:[
   {key:'system',title:'System / automation',subtitle:'Data, rules and context',icon:Bot},
   {key:'operator',title:'General plant operator',subtitle:'Plant execution',icon:Factory},
   {key:'commercial',title:'Commercial / administrative owner',subtitle:'Orders and customers',icon:BriefcaseBusiness},
   {key:'manager',title:'Manager / supervisor',subtitle:'Exceptions and outcomes',icon:UsersRound},
   {key:'support',title:'Technical administration',subtitle:'Occasional support',icon:Cog},
  ],
  stages:[
   {step:'01',title:'Reception',description:'Raw material intake and initial record.',icon:Ship,tasks:{system:{tone:'system',text:'Prefills supplier, lot and context'},operator:{tone:'operator',text:'Confirms evidence and physical measurements',icon:'check'},manager:{tone:'manager',text:'Only when blocked',icon:'alert'}}},
   {step:'02',title:'Production',description:'Processing and product transformation.',icon:Factory,tasks:{system:{tone:'system',text:'Maintains traceability and sequence'},operator:{tone:'operator',text:'Confirms process and observed yield',icon:'check'},manager:{tone:'manager',text:'Intervenes on P1 exception',icon:'alert'}}},
   {step:'03',title:'Packing',description:'Conditioning, labeling and preparation.',icon:PackageCheck,tasks:{system:{tone:'system',text:'Suggests label and destination'},operator:{tone:'operator',text:'Confirms box, lot and packed weight',icon:'check'}}},
   {step:'04',title:'Inventory and cold chain',description:'Stock, traceability and cold-chain control.',icon:Snowflake,tasks:{system:{tone:'system',text:'Updates stock and cold-chain status'},operator:{tone:'operator',text:'Confirms critical physical movements',icon:'check'}}},
   {step:'05',title:'Commercial and dispatch',description:'Orders, customers, dispatches and settlements.',icon:ShoppingCart,tasks:{system:{tone:'system',text:'Carries lot and stock context forward'},commercial:{tone:'commercial',text:'Manages orders, documents, dispatch and settlement',icon:'check'},manager:{tone:'manager',text:'Approves material decisions only',icon:'alert'}}},
   {step:'06',title:'Decision and improvement',description:'Analysis, exceptions and continuous improvement.',icon:TrendingUp,tasks:{system:{tone:'system',text:'Prioritizes P1 / P2 / P3'},manager:{tone:'manager',text:'Decides with evidence',icon:'check'},support:{tone:'support',text:'Supports users, integrations and audit',icon:'gear'}}},
  ],
  legend:[
   {tone:'system',label:'Automates / prepares',note:'The system handles repetitive work'},
   {tone:'operator',label:'Confirms / executes',note:'The person performs and validates'},
   {tone:'manager',label:'Approves / decides',note:'Only exceptions or key decisions'},
   {tone:'support',label:'Occasional support',note:'Non-daily tasks'},
  ],
  audit:{aria:'Workflow automation review',eyebrow:'Seafood Chile Core',title:'What a person should handle',description:'Observed state of the current workflow. Inherited or calculated data should not become another manual task.',system:'System',person:'Person',next:'Next simplification',ready:'Minimum flow',partial:'Can be reduced'},
  workflowFacts:[
   {stage:'Reception',state:'ready',automated:'Plant scope and date/time are inherited. Supplier, guide, zone, species and declared weight are proposed from evidence; accepted weight, loss and difference are calculated.',human:'Review documentary context only when a difference exists, then record observed gross weight, tare, drained weight and temperature.',next:'Keep administrative corrections behind the exception flow and never promote physical measurements from Vision.'},
   {stage:'Production',state:'ready',automated:'Planning calculates the next priority using orders, lots and availability.',human:'Perform the physical process and confirm the observed yield.',next:'Show the full plan only when a block or exception requires it.'},
   {stage:'Packing',state:'ready',automated:'Scanning identifies the lot; plant and station are inherited; writes avoid duplicates and tolerate offline work.',human:'Scan the lot and confirm the physical packed weight.',next:'Keep Plant, Lot and Station as manual correction fields only, not normal workflow steps.'},
   {stage:'Inventory',state:'ready',automated:'Availability, holds and kilograms without location are calculated from operational state.',human:'Intervene only to resolve a hold or a missing physical location.',next:'Keep inventory as a consequence of the flow, never as a second data-entry task.'},
   {stage:'Cold chain',state:'ready',automated:'Cycles, deviations and traceability remain in the system. When real telemetry is connected, readings can be ingested automatically.',human:'Measure and record temperature only when no active sensor exists, and review any deviation before releasing product.',next:'Manual temperature remains valid physical capture. Connecting sensors reduces workload but does not block the minimum flow.'},
   {stage:'Commercial',state:'ready',automated:'The system proposes a lot and maximum reservable quantity, keeps availability current, and carries dispatch, customer and kilograms into the sale when confirmed evidence exists.',human:'Confirm the reservation, sale price or document, and material financial decisions.',next:'Keep these confirmations because they represent deliberate economic commitments, while removing duplicate entry around them.'},
  ],
  summary:{principleLabel:'Operating principle',principle:'Capture once → confirm the physical action → automate repetitive work → escalate exceptions only → decide with evidence.',staffLabel:'Target staffing',staff:['1 general plant operator','1 commercial / administrative owner','1 manager / supervisor by exception','Technical administration: non-daily support']}
 }
}

function TaskIcon({icon}:{icon?:Task['icon']}){
 if(icon==='check')return <CheckCircle2 size={17}/>
 if(icon==='alert')return <CircleAlert size={17}/>
 if(icon==='gear')return <Cog size={17}/>
 return <Bot size={17}/>
}

export function OperatingModel(){
 const {locale}=useLocale(),c=copies[locale]
 return <div className="operating-model-page">
  <PageHeader eyebrow={c.header.eyebrow} title={c.header.title} description={c.header.description}/>
  <section className="operating-objective" aria-label={locale==='en'?'Operating objective':'Objetivo operativo'}>
   <Target size={20}/><p><strong>{c.objective.label}</strong>{c.objective.textStart}<b>{c.objective.textStrong}</b>{c.objective.textEnd}</p>
  </section>

  <section className="operating-matrix" aria-label={locale==='en'?'Task and ownership matrix':'Matriz de tareas y responsables'}>
   <div className="operating-matrix-head stage-head"><span>{c.matrixStage}</span></div>
   {c.roles.map(({key,title,subtitle,icon:Icon})=><div className={`operating-matrix-head role-head tone-${key}`} key={key}><Icon size={19}/><div><b>{title}</b><small>{subtitle}</small></div></div>)}
   {c.stages.map(stage=><div className="operating-row" key={stage.step}>
    <div className="stage-cell"><span className="stage-number">{stage.step}</span><stage.icon size={22}/><div><b>{stage.title}</b><small>{stage.description}</small></div></div>
    {c.roles.map(role=>{const task=stage.tasks[role.key];return <div className="task-cell" key={`${stage.step}-${role.key}`}>{task?<div className={`task-pill tone-${task.tone}`}><TaskIcon icon={task.icon}/><span>{task.text}</span></div>:<span className="task-empty" aria-label={c.empty}>—</span>}</div>})}
   </div>)}
  </section>

  <section className="operating-legend" aria-label={locale==='en'?'Responsibility legend':'Leyenda de responsabilidades'}>
   {c.legend.map(item=><div key={item.tone}><span className={`legend-dot tone-${item.tone}`}/><p><b>{item.label}</b><small>{item.note}</small></p></div>)}
  </section>

  <section className="workflow-audit" aria-label={c.audit.aria}>
   <header><div><span className="overline teal">{c.audit.eyebrow}</span><h2>{c.audit.title}</h2><p>{c.audit.description}</p></div></header>
   <div className="workflow-audit-grid">
    {c.workflowFacts.map(item=><article className="workflow-audit-row" key={item.stage}>
     <div className="workflow-audit-stage"><b>{item.stage}</b><span className={`workflow-state ${item.state}`}>{item.state==='ready'?c.audit.ready:c.audit.partial}</span></div>
     <div><small>{c.audit.system}</small><p>{item.automated}</p></div>
     <div><small>{c.audit.person}</small><p>{item.human}</p></div>
     <div><small>{c.audit.next}</small><p>{item.next}</p></div>
    </article>)}
   </div>
  </section>

  <section className="operating-summary">
   <div className="operating-principle"><Target size={20}/><div><span>{c.summary.principleLabel}</span><strong>{c.summary.principle}</strong></div></div>
   <div className="operating-staff"><UsersRound size={20}/><div><span>{c.summary.staffLabel}</span><ul>{c.summary.staff.map(item=><li key={item}>{item}</li>)}</ul></div></div>
  </section>
 </div>
}
