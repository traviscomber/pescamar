import {RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import {plants} from '../plants'
import './audit.css'

type AuditItem={id:string;occurred_at:string;module:string;action:string;detail:string|null;plant_id:string|null;operator_id:string|null;operator_name:string|null;reference:string|null;financial:boolean}
type Operator={id:string;full_name:string;role:string}
type Payload={items?:AuditItem[];operators?:Operator[];permissions?:{canSeeFinancial:boolean};range?:{from:string;to:string};nextCursor?:string|null;generatedAt?:string;error?:string}
const modules=[['recepciones','Recepciones'],['produccion','Producción'],['inventario','Inventario'],['costos','Costos'],['comercial','Comercial'],['planificacion','Planificación'],['cierre','Cierre']]
const plantName=new Map(plants.map(plant=>[plant.id,plant.name.replace('Planta ','')]))
const chile=(value:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santiago'}).format(new Date(value))
const isoDate=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
const defaultRange=()=>{const to=new Date(),from=new Date();from.setDate(from.getDate()-29);return {from:isoDate(from),to:isoDate(to)}}

export function Audit(){
  const initial=useMemo(()=>defaultRange(),[])
  const [items,setItems]=useState<AuditItem[]>([]),[operators,setOperators]=useState<Operator[]>([]),[from,setFrom]=useState(initial.from),[to,setTo]=useState(initial.to),[plantId,setPlantId]=useState(''),[operatorId,setOperatorId]=useState(''),[module,setModule]=useState(''),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[error,setError]=useState(''),[generatedAt,setGeneratedAt]=useState(''),[financial,setFinancial]=useState(false),[nextCursor,setNextCursor]=useState<string|null>(null)
  const query=useMemo(()=>{const p=new URLSearchParams();p.set('from',from);p.set('to',to);if(plantId)p.set('plantId',plantId);if(operatorId)p.set('operatorId',operatorId);if(module)p.set('module',module);return p.toString()},[from,to,plantId,operatorId,module])
  const load=useCallback(async(cursor?:string)=>{if(cursor)setLoadingMore(true);else setLoading(true);setError('');try{const p=new URLSearchParams(query);if(cursor)p.set('cursor',cursor);const response=await fetch(`/api/audit?${p.toString()}`);const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar auditoría');setItems(current=>cursor?[...current,...(payload.items??[])]:payload.items??[]);setOperators(payload.operators??[]);setFinancial(Boolean(payload.permissions?.canSeeFinancial));setGeneratedAt(payload.generatedAt??'');setNextCursor(payload.nextCursor??null)}catch(reason){setError(reason instanceof Error?reason.message:'No fue posible cargar auditoría')}finally{if(cursor)setLoadingMore(false);else setLoading(false)}},[query])
  useEffect(()=>{void load()},[load])
  const reset=()=>{const range=defaultRange();setFrom(range.from);setTo(range.to);setPlantId('');setOperatorId('');setModule('')}
  return <>
    <PageHeader eyebrow="Control y trazabilidad" title="Auditoría operacional" description="Quién hizo qué, cuándo y en qué planta. La trazabilidad se resuelve con identidad estable del operador." actions={<button className="button secondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?'Actualizando…':'Actualizar'}</button>}/>
    <section className="panel audit-filters" aria-label="Filtros de auditoría">
      <label>Desde<input type="date" value={from} max={to} onChange={event=>setFrom(event.target.value)}/></label>
      <label>Hasta<input type="date" value={to} min={from} onChange={event=>setTo(event.target.value)}/></label>
      <label>Planta<select value={plantId} onChange={event=>setPlantId(event.target.value)}><option value="">Todas</option>{plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name.replace('Planta ','')}</option>)}</select></label>
      <label>Operador<select value={operatorId} onChange={event=>setOperatorId(event.target.value)}><option value="">Todos</option>{operators.map(operator=><option key={operator.id} value={operator.id}>{operator.full_name}</option>)}</select></label>
      <label>Módulo<select value={module} onChange={event=>setModule(event.target.value)}><option value="">Todos</option>{modules.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button className="button ghost" type="button" onClick={reset}>Últimos 30 días</button>
    </section>
    <section className="panel audit-panel">
      <header className="panel-header"><div><span className="overline teal">Registro verificable</span><h2>{items.length} eventos cargados</h2><p>{generatedAt?`Actualizado ${chile(generatedAt)}`:'Sincronizando auditoría'}</p></div><ShieldCheck size={22}/></header>
      {!financial?<p className="audit-scope-note">Gerencia de Operaciones ve trazabilidad operacional. Los importes y eventos financieros quedan reservados a Administración.</p>:null}
      {error?<div className="system-banner error" role="alert">{error}</div>:loading?<div className="system-banner">Cargando trazabilidad…</div>:items.length?<><div className="table-wrap"><table className="data-table audit-table"><thead><tr><th>Fecha</th><th>Operador</th><th>Módulo</th><th>Acción</th><th>Referencia</th><th>Planta</th><th>Detalle</th></tr></thead><tbody>{items.map(item=><tr key={`${item.module}-${item.id}`}><td data-label="Fecha">{chile(item.occurred_at)}</td><td data-label="Operador"><b>{item.operator_name??'Identidad no enlazada'}</b></td><td data-label="Módulo"><span className="status-chip">{item.module}</span></td><td data-label="Acción">{item.action}</td><td data-label="Referencia">{item.reference??'—'}</td><td data-label="Planta">{item.plant_id?plantName.get(item.plant_id)??item.plant_id:'Corporativo'}</td><td data-label="Detalle">{item.detail??'—'}</td></tr>)}</tbody></table></div>{nextCursor?<div className="audit-load-more"><button className="button secondary" type="button" onClick={()=>void load(nextCursor)} disabled={loadingMore}>{loadingMore?'Cargando…':'Cargar 200 anteriores'}</button></div>:<p className="audit-end-note">No hay más eventos dentro del rango seleccionado.</p>}</>:<div className="empty-state"><ShieldCheck/><h3>Sin eventos para estos filtros</h3><p>La auditoría aparecerá a medida que la operación 2026 genere actividad real.</p></div>}
    </section>
  </>
}
