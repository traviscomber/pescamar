import {AlertTriangle,Database,Link2,ShieldCheck} from 'lucide-react'
import {useEffect,useState} from 'react'

type Row={rows:number|string;flagged:number|string;inflow_clp?:number|string;outflow_clp?:number|string;final_balance_clp?:number|string;amount_clp?:number|string}
type Match={transfers:number|string;exact_matches:number|string;unmatched:number|string;ambiguous:number|string;exact_match_amount_clp:number|string}
type Payload={ledger?:Row|null;transfers?:Row|null;matching?:Match|null;governance?:{rule?:string};error?:string}
const money=(value:unknown)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(value??0))

export function CanonicalAccountEvidence(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/canonical-finance-evidence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar CUENTA2');if(active)setData(payload)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar CUENTA2')});return()=>{active=false}},[])
 if(error)return <section className="panel"><div className="notice error"><AlertTriangle size={16}/>{error}</div></section>
 if(!data)return <section className="panel"><div className="empty-inline"><Database size={20}/><div><b>Cargando evidencia CUENTA2</b><small>Lectura canónica sin promoción automática.</small></div></div></section>
 const ledger=data.ledger,transfers=data.transfers,matching=data.matching
 return <section className="panel" aria-label="Evidencia canónica CUENTA2">
  <div className="section-heading"><div><span className="overline">CUENTA2 · solo lectura</span><h2>Evidencia financiera canónica</h2></div><span>{Number(ledger?.rows??0).toLocaleString('es-CL')} movimientos fuente</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><Database size={16}/>Entradas</span><b>{money(ledger?.inflow_clp)}</b><small>Según cuenta corriente fuente</small></article>
   <article className="signal-card"><span><Database size={16}/>Salidas</span><b>{money(ledger?.outflow_clp)}</b><small>Según cuenta corriente fuente</small></article>
   <article className="signal-card"><span><Database size={16}/>Balance aritmético</span><b>{money(ledger?.final_balance_clp)}</b><small>No equivale por sí solo a caja, deuda o banco</small></article>
   <article className="signal-card"><span><Link2 size={16}/>Transferencias conciliadas</span><b>{Number(matching?.exact_matches??0)}/{Number(matching?.transfers??0)}</b><small>Coincidencia única por fecha + monto</small></article>
  </div>
  <div className="governance-note"><ShieldCheck size={19}/><div><b>Separación preservada</b><p>{data.governance?.rule??'La fuente se mantiene como evidencia canónica.'} Total transferencias fuente: {money(transfers?.amount_clp)}. Casos sin match: {Number(matching?.unmatched??0)} · ambiguos: {Number(matching?.ambiguous??0)}.</p></div></div>
 </section>
}
