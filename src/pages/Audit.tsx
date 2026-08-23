import {RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import {plants} from '../plants'
import './audit.css'

type AuditItem={id:string;occurred_at:string;module:string;action:string;detail:string|null;plant_id:string|null;operator_id:string|null;operator_name:string|null;reference:string|null;financial:boolean}
type Operator={id:string;full_name:string;role:string}
type Payload={items?:AuditItem[];operators?:Operator[];permissions?:{canSeeFinancial:boolean};generatedAt?:string;error?:string}
const modules=[['recepciones','Recepciones'],['produccion','Producción'],['inventario','Inventario'],['costos','Costos'],['comercial','Comercial'],['planificacion','Planificación'],['cierre','Cierre']]
const plantName=new Map(plants.map(plant=>[plant.id,plant.name.replace('Planta ','')]))
const chile=(value:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'}).format(new Date(value))

export function Audit(){
  const [items,setItems]=useState<AuditItem[]>([]),[operators,setOperators]=useState<Operator[]>([]),[from,setFrom]=useState(''),[to,setTo]=useState(''),[plantId,setPlantId]=useState(''),[operatorId,setOperatorId]=useState(''),[module,setModule]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[generatedAt,setGeneratedAt]=useState(''),[financial,setFinancial]=useState(false)
  const query=useMemo(()=>{const p=new URLSearchParams();if(from)p.set('from',from);if(to)p.set('to',to);if(plantId)p.set('plantId',plantId);if(operatorId)p.set('operatorId',operatorId);if(module)p.set('module',module);return p.toString()},[from,to,plantId,operatorId,module])
  const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch(`/api/audit${query?`?${query}`:''}`);const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar auditoría');setItems(payload.items??[]);setOperators(payload.operators??[]);setFinancial(Boolean(payload.permissions?.canSeeFinancial));setGeneratedAt(payload.generatedAt??'')}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible cargar auditoría')}finally{setLoading(false)}},[query])
  useEffect(()=>{void load()},[load])
  return <>
    <PageHeader eyebrow="Control y trazabilidad" title="Auditoría operacional" description="Quién hizo qué, cuándo y en qué planta. La trazabilidad se resuelve con identidad estable del operador." actions={<button className="button secondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?'Actualizando…':'Actualizar'}</button>}/>
    <section className="panel audit-filters" aria-label="Filtros de auditoría">
      <label>Desde<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
      <label>Hasta<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
      <label>Planta<select value={plantId} onChange={event=>setPlantId(event.target.value)}><option value="">Todas</option>{plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name.replace('Planta ','')}</option>)}</select></label>
      <label>Operador<select value={operatorId} onChange={event=>setOperatorId(event.target.value)}><option value="">Todos</option>{operators.map(operator=><option key={operator.id} value={operator.id}>{operator.full_name}</option>)}</select></label>
      <label>Módulo<select value={module} onChange={event=>setModule(event.target.value)}><option value="">Todos</option>{modules.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button className="button ghost" type="button" onClick={()=>{setFrom('');setTo('');setPlantId('');setOperatorId('');setModule('')}}>Limpiar</button>
    </section>
    <section className="panel audit-panel">
      <header className="panel-header"><div><span className="overline teal">Registro verificable</span><h2>{items.length} eventos</h2><p>{generatedAt?`Actualizado ${chile(generatedAt)}`:'Sincronizando auditoría'}</p></div><ShieldCheck size={22}/></header>
      {!financial?<p className="audit-scope-note">Gerencia de Operaciones ve trazabilidad operacional. Los importes y eventos financieros quedan reservados a Administración.</p>:null}
      {error?<div className="system-banner error" role="alert">{error}</div>:loading?<div className="system-banner">Cargando trazabilidad…</div>:items.length?<div className="table-wrap"><table className="data-table audit-table"><thead><tr><th>Fecha</th><th>Operador</th><th>Módulo</th><th>Acción</th><th>Referencia</th><th>Planta</th><th>Detalle</th></tr></thead><tbody>{items.map(item=><tr key={`${item.module}-${item.id}`}><td data-label="Fecha">{chile(item.occurred_at)}</td><td data-label="Operador"><b>{item.operator_name??'Identidad no enlazada'}</b></td><td data-label="Módulo"><span className="status-chip">{item.module}</span></td><td data-label="Acción">{item.action}</td><td data-label="Referencia">{item.reference??'—'}</td><td data-label="Planta">{item.plant_id?plantName.get(item.plant_id)??item.plant_id:'Corporativo'}</td><td data-label="Detalle">{item.detail??'—'}</td></tr>)}</tbody></table></div>:<div className="empty-state"><ShieldCheck/><h3>Sin eventos para estos filtros</h3><p>La auditoría aparecerá a medida que la operación 2026 genere actividad real.</p></div>}
    </section>
  </>
}
