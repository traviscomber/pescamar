import {AlertTriangle,Boxes,Database,Link2,ShieldCheck} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'

type StockRow={product_family:string;rows:number|string;flagged:number|string;net_kg:number|string;first_date:string|null;last_date:string|null}
type PackingRow={pack_format:string;boxes:number|string;flagged:number|string;kg:number|string;lots:number|string;first_date:string|null;last_date:string|null}
type LotLink={lot_code:string;boxes:number|string;packing_kg:number|string;production_rows:number|string;exact_lot_match:boolean;first_packing_date:string|null;last_packing_date:string|null;first_reception_date:string|null;last_reception_date:string|null}
type Payload={ok?:boolean;stock?:StockRow[];packing?:PackingRow[];lotLinks?:LotLink[];summary?:{stockRows:number;packingBoxes:number;packingKg:number;packingLots:number;matchedLots:number;unmatchedLots:number};governance?:{rule?:string};error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const date=(value:string|null)=>value?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)):'—'

export function CanonicalInventoryEvidence(){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState('')
 useEffect(()=>{let active=true;void fetch('/api/canonical-inventory-evidence',{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(!response.ok)throw new Error(payload.error??'No fue posible cargar evidencia canónica');if(active){setData(payload);setError('')}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No fue posible cargar evidencia canónica')});return()=>{active=false}},[])
 const stock=useMemo(()=>data?.stock??[],[data?.stock]),packing=useMemo(()=>data?.packing??[],[data?.packing]),links=useMemo(()=>data?.lotLinks??[],[data?.lotLinks])
 const erizo=stock.find(row=>row.product_family.toLowerCase().includes('eriz')),pulpo=stock.find(row=>row.product_family.toLowerCase().includes('pulpo'))
 const flags=stock.reduce((sum,row)=>sum+Number(row.flagged??0),0)+packing.reduce((sum,row)=>sum+Number(row.flagged??0),0)
 if(error)return <section className="panel"><div className="notice error"><AlertTriangle size={16}/>{error}</div></section>
 if(!data)return <section className="panel"><div className="empty-inline"><Database size={20}/><div><b>Conciliando evidencia canónica</b><small>Stock, packing y lotes se mantienen separados del inventario live.</small></div></div></section>
 return <section className="panel canonical-inventory-evidence" aria-label="Evidencia canónica de inventario">
  <div className="section-heading"><div><span className="overline">Evidencia canónica · solo lectura</span><h2>Stock y packing según planilla</h2></div><span>{data.summary?.packingBoxes??0} cajas · {flags} observaciones</span></div>
  <div className="signal-grid">
   <article className="signal-card"><span><Database size={16}/>Erizo</span><b>{nf.format(Number(erizo?.net_kg??0))} kg</b><small>Resultado neto de {Number(erizo?.rows??0)} registros de planilla</small></article>
   <article className="signal-card"><span><Database size={16}/>Pulpo</span><b>{nf.format(Number(pulpo?.net_kg??0))} kg</b><small>Resultado neto de {Number(pulpo?.rows??0)} registros de planilla</small></article>
   <article className="signal-card"><span><Boxes size={16}/>Packing</span><b>{nf.format(Number(data.summary?.packingKg??0))} kg</b><small>{data.summary?.packingBoxes??0} cajas BLOQUE + IQF</small></article>
   <article className="signal-card"><span><Link2 size={16}/>Lotes conciliados</span><b>{data.summary?.matchedLots??0}/{data.summary?.packingLots??0}</b><small>Coincidencia exacta por código de lote</small></article>
  </div>
  {links.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Lote packing</th><th className="numeric">Cajas</th><th className="numeric">Kg</th><th>Producción canónica</th><th>Fecha packing</th><th>Estado</th></tr></thead><tbody>{links.map(row=><tr key={row.lot_code}><td><b>{row.lot_code}</b></td><td className="numeric">{Number(row.boxes).toLocaleString('es-CL')}</td><td className="numeric">{nf.format(Number(row.packing_kg))} kg</td><td>{Number(row.production_rows)} fila{Number(row.production_rows)===1?'':'s'} coincidente{Number(row.production_rows)===1?'':'s'}</td><td>{date(row.last_packing_date)}</td><td>{row.exact_lot_match?<span className="status success"><ShieldCheck size={13}/>Lote encontrado</span>:<span className="status warning"><AlertTriangle size={13}/>Revisar vínculo</span>}</td></tr>)}</tbody></table></div>:null}
  <p className="source-note">{data.governance?.rule??'La evidencia canónica no modifica inventario live.'} IQF permanece sin vínculo de lote cuando la fuente no lo informa; no se deriva el lote desde la fecha.</p>
 </section>
}
